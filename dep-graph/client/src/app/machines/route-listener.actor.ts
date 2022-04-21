import { createBrowserHistory } from 'history';
import { InvokeCallback } from 'xstate';
import { DepGraphUIEvents } from './interfaces';

function parseSearchParamsToEvents(searchParams: string): DepGraphUIEvents[] {
  const events: DepGraphUIEvents[] = [];
  const params = new URLSearchParams(searchParams);

  params.forEach((value, key) => {
    switch (key) {
      case 'select':
        if (value === 'all') {
          events.push({ type: 'selectAll' });
        } else if (value === 'affected') {
          events.push({ type: 'selectAffected' });
        }
        break;
      case 'focus':
        events.push({ type: 'focusProject', projectName: value });
        break;
      case 'groupByFolder':
        events.push({ type: 'setGroupByFolder', groupByFolder: true });
        break;
      case 'collapseEdges':
        events.push({ type: 'setCollapseEdges', collapseEdges: true });
        break;
      case 'searchDepth':
        const parsedValue = parseInt(value, 10);

        if (parsedValue === 0) {
          events.push({
            type: 'setSearchDepthEnabled',
            searchDepthEnabled: false,
          });
        } else if (parsedValue > 1) {
          events.push({
            type: 'setSearchDepth',
            searchDepth: parseInt(value),
          });
        }
        break;
      case 'traceAlgorithm':
        if (value === 'shortest' || value === 'all') {
          // this needs to go before other tracing options or else the default of 'shortest' gets used
          events.unshift({ type: 'setTracingAlgorithm', algorithm: value });
        }
        break;
      case 'traceStart':
        events.push({
          type: 'setTracingStart',
          projectName: value,
        });
        break;
      case 'traceEnd':
        events.push({ type: 'setTracingEnd', projectName: value });
        break;
    }
  });
  return events;
}

export const routeListener: InvokeCallback<
  DepGraphUIEvents,
  DepGraphUIEvents
> = (callback) => {
  const history = createBrowserHistory();

  parseSearchParamsToEvents(history.location.search).forEach((event) =>
    callback(event)
  );
};
