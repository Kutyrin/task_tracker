import { INestApplication } from '@nestjs/common';

import { createE2EApp } from './setup-e2e';

describe('App e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2EApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should bootstrap the application', () => {
    expect(app).toBeDefined();
  });
});
