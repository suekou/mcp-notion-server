import { markdownToBlocks } from '@tryfabric/martian';
import { BlockResponse } from '../types/responses.js';

export function convertMdToBlocks(md: string): Partial<BlockResponse>[] {
  return markdownToBlocks(md);
}
