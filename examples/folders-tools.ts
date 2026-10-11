import { Woku } from '../packages/sdk/src/index';

/** Organize the listening: a folder, a tool inside it, figures and a batch move. */
export async function organize(woku: Woku) {
  const folder = await woku.folders.create({ name: 'Post-sale' });
  const csat = await woku.csatTools.create({
    name: 'Delivery',
    question: 'How satisfied are you with your delivery?',
    folderId: folder.id,
  });

  const tools = [];
  for await (const tool of await woku.tools.list({ folderId: folder.id })) {
    tools.push(tool);
  }

  const stats = await woku.tools.stats({ folderId: folder.id });
  await woku.tools.move({
    items: [{ type: 'csat', id: csat._id }],
    folderId: null,
  });
  return { tools, stats };
}
