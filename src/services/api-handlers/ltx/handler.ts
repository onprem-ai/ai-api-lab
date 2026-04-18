/**
 * Lightricks LTX video generation handler — PLACEHOLDER.
 *
 * Model: https://huggingface.co/Lightricks/LTX-2.3-nvfp4
 * GitHub: https://github.com/Lightricks/LTX-2
 * Console: https://console.ltx.video/playground/
 *
 * LTX-2.3 currently has NO documented public REST API.
 * Available interfaces:
 * - CLI: `python -m ltx_pipelines.ti2vid_two_stages --prompt "..." --output-path out.mp4`
 * - Python: programmatic pipeline classes
 * - ComfyUI: LTXVideo nodes
 * - Hosted playground: console.ltx.video (no documented API)
 *
 * This handler is a placeholder that returns an error directing users to
 * the available interfaces. It will be implemented once a REST API is available.
 */
import type { NonStreamingApiHandler } from '../types';
import { AUTH_BEARER } from '../types';

export const ltxHandler: NonStreamingApiHandler = {
  type: 'ltx',
  label: 'LTX Video',
  description: 'Lightricks LTX-2 video generation — no public REST API yet',
  category: 'Video Gen',
  authConfig: AUTH_BEARER,
  streaming: false,
  ui: {
    requiresImage: false,
    requiresPrompt: true,
    requiresSystemPrompt: false,
    requiresMaxTokens: false,
  },
  async execute() {
    throw new Error(
      'LTX video generation has no public REST API yet. ' +
      'Use the CLI (python -m ltx_pipelines.ti2vid_two_stages), ' +
      'Python API, or ComfyUI nodes instead. ' +
      'See: https://github.com/Lightricks/LTX-2'
    );
  },
};
