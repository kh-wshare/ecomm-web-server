import { Injectable } from '@nestjs/common';
import { filter, Observable, Subject } from 'rxjs';

export interface AppEvent<T = unknown> {
  type: string;
  payload: T;
  occurredAt: Date;
}

@Injectable()
export class EventBusService {
  private readonly events = new Subject<AppEvent>();

  publish<T>(type: string, payload: T): void {
    this.events.next({ type, payload, occurredAt: new Date() });
  }

  ofType<T>(type: string): Observable<AppEvent<T>> {
    return this.events
      .asObservable()
      .pipe(filter((event): event is AppEvent<T> => event.type === type));
  }
}
