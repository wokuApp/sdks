import {
  Woku,
  type CustomTicketDestinationConfig,
} from '../packages/sdk/src/index';

/** Proposed next-release example; requires the matching deployed API. */
export async function readFollowUp(woku: Woku, ticketId: string) {
  const ticket = await woku.tickets.get(ticketId);
  const conversationId = ticket.followUp?.conversationId;
  return {
    ticket,
    enriched: (ticket.followUp?.appliedSummaryVersion ?? 0) >= 1,
    conversation: conversationId
      ? await woku.followUps.get(conversationId)
      : undefined,
  };
}

/** Explicit receiver contract, proposed for the same upcoming API release. */
export const customDestination: CustomTicketDestinationConfig = {
  url: 'https://sac.example.com/tickets',
  method: 'POST',
  update: {
    mode: 'remote-id',
    url: 'https://sac.example.com/tickets/{{remoteId}}',
    method: 'PATCH',
    responseIdPath: 'result.id',
  },
};
