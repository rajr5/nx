import { from } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { interpret, Interpreter, Typestate } from 'xstate';
import { depGraphMachine } from './dep-graph.machine';
import {
  DepGraphContext,
  DepGraphUIEvents,
  DepGraphSend,
  DepGraphStateObservable,
  DepGraphSchema,
} from './interfaces';

let depGraphService: Interpreter<
  DepGraphContext,
  DepGraphSchema,
  DepGraphUIEvents,
  Typestate<DepGraphContext>
>;

let depGraphState$: DepGraphStateObservable;

export function useDepGraphService(): [DepGraphStateObservable, DepGraphSend] {
  if (!depGraphService) {
    depGraphService = interpret(depGraphMachine, {
      devTools: !!window.useXstateInspect,
    });
    depGraphService.start();

    depGraphState$ = from(depGraphService).pipe(
      map((state) => ({
        value: state.value,
        context: state.context,
      })),
      shareReplay(1)
    );
  }

  return [depGraphState$, depGraphService.send];
}
