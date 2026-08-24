import type { DataGovSgClient } from "./data-gov.js";
import { type DataGovRealtimeResponse } from "./data-gov.js";

/** NEA-produced observations exposed through Singapore's data.gov.sg realtime API. */
export class NeaPublicClient {
  constructor(private readonly dataGov: DataGovSgClient) {}

  twoHourForecast(date?: string, signal?: AbortSignal): Promise<DataGovRealtimeResponse> {
    return this.dataGov.realtime("two-hr-forecast", date, signal);
  }

  twentyFourHourForecast(date?: string, signal?: AbortSignal): Promise<DataGovRealtimeResponse> {
    return this.dataGov.realtime("twenty-four-hr-forecast", date, signal);
  }

  rainfall(date?: string, signal?: AbortSignal): Promise<DataGovRealtimeResponse> {
    return this.dataGov.realtime("rainfall", date, signal);
  }

  psi(date?: string, signal?: AbortSignal): Promise<DataGovRealtimeResponse> {
    return this.dataGov.realtime("psi", date, signal);
  }

  pm25(date?: string, signal?: AbortSignal): Promise<DataGovRealtimeResponse> {
    return this.dataGov.realtime("pm25", date, signal);
  }

  uv(date?: string, signal?: AbortSignal): Promise<DataGovRealtimeResponse> {
    return this.dataGov.realtime("uv", date, signal);
  }
}
