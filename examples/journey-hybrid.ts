import { Woku, type JourneyInput } from '../packages/sdk/src/index';

/** Backend example: prepare a four-moment journey without activating or sending. */
export const prepareHybridJourney = async (
  woku: Woku,
  image: Uint8Array,
): Promise<string> => {
  const media = await woku.media.upload({
    file: image,
    filename: 'delivery.jpg',
    contentType: 'image/jpeg',
  });
  const momentDefaults = {
    enabled: true,
    toolScope: 'shared' as const,
    channel: 'email' as const,
    sequence: {
      attemptOffsetsMs: [0, 86_400_000],
      deadlineMs: 259_200_000,
      cooldownAfterResponseMs: 0,
    },
  };
  const moments: NonNullable<JourneyInput['moments']> = [
    {
      ...momentDefaults,
      key: 'sale',
      name: 'Purchase',
      tool: 'csat',
      trigger: { type: 'manual' },
      toolSpec: { subject: { es: 'la compra', en: 'the purchase' } },
    },
    {
      ...momentDefaults,
      key: 'delivery',
      name: 'Delivery',
      tool: 'woku',
      toolScope: 'per_enrollment',
      trigger: { type: 'webhook' },
      description: 'Delivery experience',
      toolSpec: { descriptionEn: 'Delivery experience', fileId: media.fileId },
      fallbackFromStage: 'sale',
      fallbackAfterMs: 864_000_000,
      webhook: {
        contentMode: 'webhook',
        verification: { mode: 'url_token' },
        schema: {
          type: 'object',
          properties: {
            order: { type: 'string' },
            late: { type: 'boolean' },
            email: { type: 'string' },
          },
        },
        payload: { subjectKey: 'order', email: 'email' },
        content: {
          description: {
            mode: 'javascript',
            value:
              "return payload.late ? 'Delayed delivery' : 'Delivery experience';",
          },
          descriptionEn: { mode: 'literal', value: 'Delivery experience' },
        },
      },
    },
    {
      ...momentDefaults,
      key: 'use',
      name: 'Product use',
      tool: 'ces',
      trigger: {
        type: 'afterStage',
        anchor: 'sent',
        stage: 'delivery',
        delayMs: 864_000_000,
      },
      toolSpec: {
        subject: { es: 'usar el producto', en: 'using the product' },
      },
    },
    {
      ...momentDefaults,
      key: 'loyalty',
      name: 'Recommendation',
      tool: 'nps',
      trigger: {
        type: 'afterStage',
        anchor: 'sent',
        stage: 'use',
        delayMs: 864_000_000,
      },
      toolSpec: { audience: { es: 'esta empresa', en: 'this business' } },
    },
  ];
  const created = await woku.journeys.create({
    name: `Hybrid SDK journey ${Date.now()}`,
    authoringVersion: 2,
    startMode: 'operator',
    enabled: false,
    moments,
    recipients: {
      ticketsEnabled: false,
      plansEnabled: false,
      ticketEmails: [],
      planMembers: [],
    },
  });
  await woku.journeys.previewMoment(created.id, 'delivery', {
    order: 'order-123',
    late: true,
    email: 'client@example.com',
  });
  return created.id;
};

// Configure secrets using the environment. Keep minted URLs and sender secrets
// out of logs; webhook requests use an independent fetch, never woku.client.
