/**
 * core/publisher.js — State Streaming for Dashboard (v8.4)
 * 
 * Simple event-based publisher that broadcasts agent state updates
 * to the dashboard server.
 */

'use strict';

const EventEmitter = require('events');

class Publisher extends EventEmitter {
    constructor() {
        super();
        this.maxHistory = 20;
        this.events = [];
    }

    /**
     * Broadcast an update
     * @param {string} type - Event type (thinking, tool_call, result, etc.)
     * @param {object} data - Event payload
     */
    publish(type, data) {
        const payload = {
            timestamp: Date.now(),
            type,
            data
        };

        this.events.push(payload);
        if (this.events.length > this.maxHistory) this.events.shift();

        this.emit('update', payload);
    }

    getHistory() {
        return this.events;
    }
}

const publisher = new Publisher();
module.exports = publisher;
