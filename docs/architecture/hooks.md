# Hooks

```bash
foal generate hook my-hook
```

## Description

Hooks are decorators that execute extra logic before and/or after the execution of a controller method.

They are particulary useful in these scenarios:
- authentication & access control
- request validation & sanitization
- logging

They improve code readability and make unit testing easier.

## Built-in Hooks

Foal provides a number of hooks to handle the most common scenarios.

- `ValidateBody`, `ValidateHeaders`, `ValidateParams` and `ValidateQuery` validate the format of the incoming HTTP requests (see [Validation](../validation-and-sanitization.md)).
- `Log` displays information on the request (see [Logging & Debugging](../utilities/logging-and-debugging.md)).
- `JWTRequired`, `JWTOptional`, `LoginRequired`, `LoginOptional` authenticate the user by filling the `ctx.user` property.
- `PermissionRequired` restricts the route access to certain users.

## Use

A hook can decorate a controller method or the controller itself. If it decorates the controller then it applies to all its methods and sub-controllers.

In the below example, `LoginRequired` applies to `listProducts` and `addProduct`.

*Example:*
```typescript
import {
  Get, HttpResponseCreated, HttpResponseOK,
  LoginRequired, Post, ValidateBody
} from '@foal/core';

@LoginRequired(/* ... */)
class AppController {
  private products = [
    { name: 'Hoover' }
  ];

  @Get('/products')
  listProducts() {
    return new HttpResponseOK(this.products)
  }

  @Post('/products')
  @ValidateBody({
    type: 'object',
    properties: {
      name: { type: 'string' }
    },
    additionalProperties: false,
    required: [ 'name' ]
  })
  addProduct(ctx) {
    this.products.push(ctx.request.body);
    return new HttpResponseCreated();
  }

}
```

If the user makes a POST request to `/products` whereas she/he is not authenticated, then the server will respond with a 401 error and the `ValidateBody` hook and `addProduct` method won't be executed.

## Architecture

In addition to the hooks provided by FoalTS, you can also create your own.

A hook is made of a small function, synchronous or asynchronous, that is executed before the controller method.

To create one, you need to call the `Hook` function.

*Example:*
```typescript
import { Get, Hook, HttpResponseOK } from '@foal/core';

class MyController {

  @Get('/')
  @Hook(() => {
    console.log('Receiving GET / request...');
  })
  index() {
    return new HttpResponseOK('Hello world!');
  }

}
```

The hook function can take two parameters: the `Context` object and the service manager. The [Context object](./controllers.md) is specific to the request and gives you information on it. The service manager lets you access any service through its `get` method.

*Example:*
```typescript
import { Get, Hook, HttpResponseOK } from '@foal/core';

class Logger {
  log(message: string) {
    console.log(`${new Date()} - ${message}`);
  }
}

class MyController {

  @Get('/')
  @Hook((ctx, services) => {
    const logger = services.get(Logger);
    logger.log('IP: ' + ctx.request.ip);
  })
  index() {
    return new HttpResponseOK('Hello world!');
  }

}
```

A hook function can return an `HttpResponse` object. If so, the remaining hooks and the controller method are not executed and the object is used to render the HTTP response.

*Example:*
```typescript
import { Get, Hook, HttpResponseBadRequest, HttpResponseOK } from '@foal/core';

class MyController {

  @Get('/')
  @Hook((ctx) => {
    if (typeof ctx.request.body.name !== 'string') {
      return new HttpResponseBadRequest();
    }
  })
  index() {
    return new HttpResponseOK('Hello world!');
  }

}
```

A hook function may also return a *hook post function* to be executed after the controller method. It is interesting in case you want to change the HTTP response or perform logging.

*Example:*
```typescript
import { Get, Hook, HttpResponseOK } from '@foal/core';

class MyController {

  @Get('/')
  @Hook(() => {
    const time = process.hrtime(); 

    return () => {
      const seconds = process.hrtime(time)[0];
      console.log(`Executed in ${seconds} seconds`);
    };
  })
  index() {
    return new HttpResponseOK('Hello world!');
  }

}
```

A *hook post function* accepts three parameters: the context, the service manager and the response returned by the controller method.

## Testing Hooks

Hooks can be tested thanks to the `getHookFunction`.

```typescript
// validate-body.hook.ts
import { Hook, HttpResponseBadRequest } from '@foal/core';

export const validateBody = Hook(ctx => {
  if (typeof ctx.request.body.name !== 'string') {
    return new HttpResponseBadRequest();
  }
})
```

```typescript
// validate-body.hook.spec.ts
import {
  Context, getHookFunction,
  isHttpResponseBadRequest, ServiceManager
} from '@foal/core';
import { validateBody } from './validate-body.hook';

it('validateBody', () => {
  const ctx = Context({
    // fake request object
    body: { name: 3 }
  });
  const hook = getHookFunction(validateBody);
  
  const response = hook(ctx, new ServiceManager());

  if (!isHttpResponseBadRequest(response)) {
    throw new Error();
  }
});
```

### Mocking services

You can mock services by using the `set` method of the service manager.

*Example:*
```typescript
// authenticate.hook.ts
import { Get, Hook, HttpResponseOK } from '@foal/core';

export class UserService {
  private users = {
    eh4sb: { id: 1, name: 'John' },
    kadu5: { id: 2, name: 'Mary' }
  };

  getUser(key: string) {
    return this.users[key];
  }
}

export const authenticate = Hook((ctx, services) => {
  const users = services.get(UserService);
  ctx.user = users.getUser(ctx.params.query.key);
});
```

```typescript
// authenticate.hook.spec.ts
import { strictEqual } from 'assert';
import { Context, getHookFunction } from '@foal/core';
import { authenticate, UserService } from './authenticate.hook';

it('authenticate', () => {
  const hook = getHookFunction(authenticate);

  const user = { id: 3, name: 'Bob' };

  const ctx = Context();
  const services = new ServiceManager();
  services.set(UserService, {
    getUser() {
      return user;
    }
  })
  
  hook(ctx, services);

  strictEqual(ctx.user, user);
});
```

## Hook factories

Usually, we don't create hooks directly by hook factories. Thus it is easier to customize the hook behavior on each route.

*Example:*
```typescript
import { Get, Hook } from '@foal/core';

function Log(msg: string) {
  return Hook(() => { console.log(msg); });
}

class MyController {
  @Get('/route1')
  @Log('Receiving a GET /route1 request...')
  route1() {
    // ...
  }

  @Get('/route2')
  @Log('Receiving a GET /route2 request...')
  route2() {
    // ...
  }
}
```