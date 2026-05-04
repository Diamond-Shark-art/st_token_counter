import { eventSource, event_types } from '../../../../script.js';
import { debounce } from '../../../utils.js';

const WIDGET_ID = 'chat_token_counter_widget';
const VALUE_ID = 'chat_token_counter_value';

let openaiMod = null;

function recount() {
    const total = openaiMod?.promptManager?.tokenHandler?.getTotal();
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

    // Track generation state — promptManager.tokenHandler is unreliable
    // during prompt assembly (it briefly reports an inflated total).
    let generating = false;
    if (event_types.GENERATION_STARTED) {
        eventSource.on(event_types.GENERATION_STARTED, () => { generating = true; });
    }
    const generationFinished = () => {
        generating = false;
        recountDebounced();
    };
    if (event_types.GENERATION_ENDED) eventSource.on(event_types.GENERATION_ENDED, generationFinished);
    if (event_types.GENERATION_STOPPED) eventSource.on(event_types.GENERATION_STOPPED, generationFinished);

    const safeRecount = () => { if (!generating) recountDebounced(); };

    eventSource.on(event_types.CHAT_CHANGED, safeRecount);
    eventSource.on(event_types.MESSAGE_RECEIVED, safeRecount);
    eventSource.on(event_types.MESSAGE_EDITED, safeRecount);
    eventSource.on(event_types.MESSAGE_UPDATED, safeRecount);
    eventSource.on(event_types.MESSAGE_DELETED, safeRecount);
    eventSource.on(event_types.MESSAGE_SWIPED, safeRecount);
});
