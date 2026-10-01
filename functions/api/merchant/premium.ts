// Legacy self-asserted demo endpoint — retired.
// The registry-based service resource (/api/merchant/r/:serviceId) is the only
// supported 402-gated resource. This endpoint no longer unlocks anything.
import { json } from '../../_lib/payment';

export async function onRequestGet() {
  return json({
    error: 'ENDPOINT_RETIRED',
    message: 'This demo endpoint was retired. Registry-priced services at /api/merchant/r/:serviceId are the supported path.',
  }, 410);
}
