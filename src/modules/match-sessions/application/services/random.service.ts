import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

@Injectable()
export class RandomService {
  int(maxExclusive: number): number {
    return randomInt(maxExclusive);
  }
}
