import PQueue from 'p-queue';

// Fix: We explicitly say this object handles ANY string key
const queues: Record<string, PQueue> = {
  'sweetwater.com': new PQueue({ concurrency: 1, interval: 5000 }),
  'thomann.de': new PQueue({ concurrency: 1, interval: 2000 }),
};

export async function scheduleScrape(url: string, task: () => Promise<any>) {
  // Extract domain (e.g., "sweetwater.com")
  let domain = new URL(url).hostname.replace('www.', '');

  // If we don't have a specific queue for this site, create a default one on the fly
  if (!queues[domain]) {
    queues[domain] = new PQueue({ concurrency: 1, interval: 2000 });
  }

  // Add the task to the queue
  return queues[domain].add(task);
}