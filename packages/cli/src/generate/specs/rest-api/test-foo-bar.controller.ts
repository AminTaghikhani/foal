import {
  Context, Delete, Get, HttpResponseCreated, HttpResponseMethodNotAllowed,
  HttpResponseNoContent, HttpResponseNotFound, HttpResponseOK, Patch, Post,
  Put, ValidateBody, ValidateQuery
} from '@foal/core';
import { getRepository } from 'typeorm';

import { TestFooBar } from '../entities';

const testFooBarSchema = {
  additionalProperties: false,
  properties: {
    text: { type: 'string', maxLength: 255 },
  },
  required: [ 'text' ],
  type: 'object',
};

export class TestFooBarController {

  @Get('/')
  @ValidateQuery({
    properties: {
      skip: { type: 'number' },
      take: { type: 'number' },
    },
    type: 'object',
  })
  async get(ctx: Context) {
    const testFooBars = await getRepository(TestFooBar).find({
      skip: ctx.request.query.skip,
      take: ctx.request.query.take
    });
    return new HttpResponseOK(testFooBars);
  }

  @Get('/:id')
  async getById(ctx: Context) {
    const testFooBar = await getRepository(TestFooBar).findOne(ctx.request.params.id);

    if (!testFooBar) {
      return new HttpResponseNotFound();
    }

    return new HttpResponseOK(testFooBar);
  }

  @Post('/')
  @ValidateBody(testFooBarSchema)
  async post(ctx: Context) {
    const testFooBar = await getRepository(TestFooBar).save(ctx.request.body);
    return new HttpResponseCreated(testFooBar);
  }

  @Post('/:id')
  postById() {
    return new HttpResponseMethodNotAllowed();
  }

  @Patch('/')
  patch() {
    return new HttpResponseMethodNotAllowed();
  }

  @Patch('/:id')
  @ValidateBody({ ...testFooBarSchema, required: [] })
  async patchById(ctx: Context) {
    const testFooBar = await getRepository(TestFooBar).findOne(ctx.request.params.id);

    if (!testFooBar) {
      return new HttpResponseNotFound();
    }

    Object.assign(testFooBar, ctx.request.body);

    await getRepository(TestFooBar).save(testFooBar);

    return new HttpResponseOK(testFooBar);
  }

  @Put('/')
  put() {
    return new HttpResponseMethodNotAllowed();
  }

  @Put('/:id')
  @ValidateBody(testFooBarSchema)
  async putById(ctx: Context) {
    const testFooBar = await getRepository(TestFooBar).findOne(ctx.request.params.id);

    if (!testFooBar) {
      return new HttpResponseNotFound();
    }

    Object.assign(testFooBar, ctx.request.body);

    await getRepository(TestFooBar).save(testFooBar);

    return new HttpResponseOK(testFooBar);
  }

  @Delete('/')
  delete() {
    return new HttpResponseMethodNotAllowed();
  }

  @Delete('/:id')
  async deleteById(ctx: Context) {
    const testFooBar = await getRepository(TestFooBar).findOne(ctx.request.params.id);

    if (!testFooBar) {
      return new HttpResponseNotFound();
    }

    await getRepository(TestFooBar).delete(ctx.request.params.id);

    return new HttpResponseNoContent();
  }

}