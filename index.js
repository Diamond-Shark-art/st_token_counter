import { eventSource, event_types } from '../../../../script.js';
import { getContext } from '../../../extensions.js';
import { getTokenCountAsync } from '../../../tokenizers.js';
import { debounce } from '../../../utils.js';

const WIDGET_ID = 'chat_token_counter_widget';
const VALUE_ID = 'chat_token_counter_value';

function setValue(v) {
    const el = document.getElementById(VALUE_ID);
    if (el) el.textContent = String(v);
}

async function recount() {
    const ctx = getContext();
    if (!ctx || !Array.isArray(ctx.chat)) {
        setValue(0);
        return;
    }
    const text = ctx.chat
        .filter(m => m && m.mes && !m.is_system)
        .map(m => m.mes)
        .join('\n');
    try {
        const count = text.length ? await getTokenCountAsync(text) : 0;
        setValue(count);
    } catch (err) {
        console.error('[chat-token-counter] count failed', err);
        setValue('?');
    }
}

function injectWidget() {
    if (document.getElementById(WIDGET_ID)) return true;
    const host = document.getElementById('form_sheld');
    if (!host) return false;
    const widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.className = 'flex-container alignItemsCenter';
    widget.innerHTML =
        '<span class="ctc-label">Chat tokens:</span> ' +
        `<span id="${VALUE_ID}">0</span>`;
    host.prepend(widget);
    return true;
}

const recountDebounced = debounce(recount, 250);

jQuery(async () => {
    if (!injectWidget()) {
        const start = Date.now();
        const iv = setInterval(() => {
            if (injectWidget() || Date.now() - start > 5000) {
                clearInterval(iv);
            }
        }, 100);
    }

    eventSource.on(event_types.CHAT_CHANGED, recountDebounced);
    eventSource.on(event_types.MESSAGE_SENT, recountDebounced);
    eventSource.on(event_types.MESSAGE_RECEIVED, recountDebounced);
    eventSource.on(event_types.MESSAGE_EDITED, recountDebounced);
    eventSource.on(event_types.MESSAGE_UPDATED, recountDebounced);
    eventSource.on(event_types.MESSAGE_DELETED, recountDebounced);
    eventSource.on(event_types.MESSAGE_SWIPED, recountDebounced);

    recount();
});
