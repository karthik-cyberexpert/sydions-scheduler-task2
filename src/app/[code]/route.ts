import { redirect } from 'next/navigation';
import { getUrl, incrementClicks } from '../../lib/db';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  if (code && code.length === 6) {
    const urlMapping = await getUrl(code);
    if (urlMapping) {
      // Increment clicks asynchronously
      await incrementClicks(code);
      // Redirect to target URL
      redirect(urlMapping.longUrl);
    }
  }

  // Fallback to home if not found
  redirect('/');
}
