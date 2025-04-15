import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This endpoint just returns a timestamp to force SWR to revalidate
  // Use this to bust the cache when you need to refresh tournament data
  if (req.method === 'GET') {
    // Return the current timestamp with a 5-minute cache-control header
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json({ timestamp: Date.now() });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}