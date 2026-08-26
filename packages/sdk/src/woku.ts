import { WokuClient, type WokuClientOptions } from './core/client';
import { Trackers } from './resources/trackers';
import { CesTools, CsatTools, NpsTools } from './resources/voc-tools';
import { Ces, Csat, Nps } from './resources/surveys';
import { Wokus } from './resources/wokus';
import { Forms } from './resources/forms';
import { Flows } from './resources/flows';
import { ActionPlanGroups, ActionPlans } from './resources/action-plans';
import { TicketDestinations, Tickets } from './resources/tickets';
import { Dispatches } from './resources/dispatches';
import { Reports } from './resources/reports';
import { Company } from './resources/company';
import { Quarantines } from './resources/quarantines';

/**
 * Entry point to the Woku management API.
 *
 * ```ts
 * const woku = new Woku({ apiKey: process.env.WOKU_API_KEY });
 * const tracker = await woku.trackers.create({ name: 'Store', system: 'retail' });
 * for await (const ticket of await woku.tickets.list({ severity: 'high' })) {
 *   console.log(ticket.title);
 * }
 * ```
 */
export class Woku {
  /** The underlying transport (advanced use). */
  readonly client: WokuClient;

  readonly trackers: Trackers;
  readonly npsTools: NpsTools;
  readonly csatTools: CsatTools;
  readonly cesTools: CesTools;
  readonly nps: Nps;
  readonly csat: Csat;
  readonly ces: Ces;
  readonly wokus: Wokus;
  readonly forms: Forms;
  readonly flows: Flows;
  readonly actionPlans: ActionPlans;
  readonly actionPlanGroups: ActionPlanGroups;
  readonly tickets: Tickets;
  readonly ticketDestinations: TicketDestinations;
  readonly dispatches: Dispatches;
  readonly reports: Reports;
  readonly company: Company;
  readonly quarantines: Quarantines;

  constructor(options?: WokuClientOptions | string) {
    const opts: WokuClientOptions =
      typeof options === 'string' ? { apiKey: options } : (options ?? {});
    this.client = new WokuClient(opts);

    this.trackers = new Trackers(this.client);
    this.npsTools = new NpsTools(this.client);
    this.csatTools = new CsatTools(this.client);
    this.cesTools = new CesTools(this.client);
    this.nps = new Nps(this.client);
    this.csat = new Csat(this.client);
    this.ces = new Ces(this.client);
    this.wokus = new Wokus(this.client);
    this.forms = new Forms(this.client);
    this.flows = new Flows(this.client);
    this.actionPlans = new ActionPlans(this.client);
    this.actionPlanGroups = new ActionPlanGroups(this.client);
    this.tickets = new Tickets(this.client);
    this.ticketDestinations = new TicketDestinations(this.client);
    this.dispatches = new Dispatches(this.client);
    this.reports = new Reports(this.client);
    this.company = new Company(this.client);
    this.quarantines = new Quarantines(this.client);
  }
}
