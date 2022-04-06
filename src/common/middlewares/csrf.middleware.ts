import { NextFunction, Request, Response } from 'express';

export function setCsrfToken(req: Request, res: Response, next: NextFunction) {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
}
