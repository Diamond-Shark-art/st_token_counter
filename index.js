import { eventSource, event_types } from '../../../../script.js';
import { debounce } from '../../../utils.js';

const WIDGET_ID = 'chat_token_counter_widget';
const VALUE_ID = 'chat_token_counter_value';

let openaiMod = null;

// Read promptManager.tokenUsage — the snapshot captured during prompt
// assembly that the Prompt Manager UI itself displays. tokenHandler.getTotal()
// is unreliable: other code paths add entries to tokenHandler.counts (e.g.
// a 'conversation' key) after populateTokenCounts() runs, inflating the sum.
function recount() {
    const total = openaiMod?.promptManager?.tokenUsage;
    const el = document.getElementById(VALUE_ID);
    if (!el) return;
    if (typeof total === 'number' && total > 0) {
        el.innerHTML = `<span class="ctc-label">Total tokens:</span> ${total}`;
    }
}

function injectWidget() {
    if (document.getElementById(WIDGET_ID)) return true;
    const host = document.getElementById('form_sheld');
    if (!host) return false;
    const widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.className = 'flex-container alignItemsCenter';
    widget.innerHTML = `<span id="${VALUE_ID}"></span>`;
    host.prepend(widget);
    return true;
}

const recountDebounced = debounce(recount, 250);

jQuery(async () => {
    try {
        openaiMod = await import('../../../openai.js');
    } catch {
        console.warn('[chat-token-counter] could not load openai.js');
    }

    if (!injectWidget()) {
        const start = Date.now();
        const iv = setInterval(() => {
            if (injectWidget() || Date.now() - start > 5000) clearInterval(iv);
        }, 100);
    }

    // tokenUsage is updated only when a prompt is assembled. The most
    // reliable trigger is CHAT_COMPLETION_PROMPT_READY, which fires right
    // after populateTokenCounts() sets the snapshot.
    if (event_types.CHAT_COMPLETION_PROMPT_READY) {
        eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, recountDebounced);
    }
    eventSource.on(event_types.CHAT_CHANGED, recountDebounced);
    eventSource.on(event_types.MESSAGE_RECEIVED, recountDebounced);
    eventSource.on(event_types.MESSAGE_SWIPED, recountDebounced);
});
