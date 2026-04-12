import { eventSource, event_types } from '../../../../script.js';
import { getContext } from '../../../extensions.js';
import { getTokenCountAsync } from '../../../tokenizers.js';
import { debounce } from '../../../utils.js';

const WIDGET_ID = 'chat_token_counter_widget';
const VALUE_ID = 'chat_token_counter_value';

let lastPresetTokens = null;

function getPresetTokens(chatTokens) {
    try {
        // promptManager is a late-initialized export — use dynamic import to
        // avoid issues if openai.js hasn't set it up yet.
        // We cache the module reference after the first successful load.
        if (!getPresetTokens._mod) return null;

        const pm = getPresetTokens._mod.promptManager;
        if (!pm?.tokenHandler) return null;

        const total = pm.tokenHandler.getTotal();
        if (typeof total !== 'number' || total <= 0) return null;

        // promptManager total includes chat messages, so subtract them.
        const preset = Math.max(0, total - chatTokens);
        return preset;
    } catch {
        return null;
    }
}

function updateDisplay(chatTokens, presetTokens) {
    const el = document.getElementById(VALUE_ID);
    if (!el) return;

    if (presetTokens !== null) {
        const total = chatTokens + presetTokens;
        el.innerHTML =
            `<span class="ctc-label">Total tokens:</span> ${total} ` +
            `<span class="ctc-detail">(${chatTokens} chat - ${presetTokens} preset)</span>`;
    } else {
        el.innerHTML =
            `<span class="ctc-label">Chat tokens:</span> ${chatTokens}`;
    }
}

async function recount() {
    const ctx = getContext();
    if (!ctx || !Array.isArray(ctx.chat)) {
        updateDisplay(0, null);
        return;
    }
    const text = ctx.chat
        .filter(m => m && m.mes && !m.is_system)
        .map(m => m.mes)
        .join('\n');
    try {
        const chatTokens = text.length ? await getTokenCountAsync(text) : 0;
        const presetTokens = getPresetTokens(chatTokens);
        if (presetTokens !== null) lastPresetTokens = presetTokens;
        updateDisplay(chatTokens, presetTokens ?? lastPresetTokens);
    } catch (err) {
        console.error('[chat-token-counter] recount failed', err);
        updateDisplay(0, null);
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
    // Eagerly load the openai module so promptManager is available on recount.
    try {
        getPresetTokens._mod = await import('../../../openai.js');
    } catch {
        console.warn('[chat-token-counter] could not load openai.js — preset count unavailable');
    }

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

    // Also recount after prompt assembly (populates promptManager token data).
    if (event_types.CHAT_COMPLETION_PROMPT_READY) {
        eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, recountDebounced);
    }

    recount();
});
