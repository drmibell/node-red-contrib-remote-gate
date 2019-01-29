/**
 * Copyright 2019 M. I. Bell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 
module.exports = function(RED) {
    "use strict";
    var events = require('events');

    function RemoteGateNode(n) {
        RED.nodes.createNode(this,n);
        const openStatus = {fill:"green",shape:"dot",text:"open"};
        const closedStatus = {fill:'red',shape:'ring',text:'closed'};
        var status;
        // Copy configuration items
        this.topic = n.topic;
        this.defaultState = n.defaultState.toLowerCase();
        this.openCmd = n.openCmd.toLowerCase();
        this.closeCmd = n.closeCmd.toLowerCase();
        this.toggleCmd = n.toggleCmd.toLowerCase();
        this.defaultCmd = n.defaultCmd.toLowerCase();
        this.persist = n.persist;
        // Save "this" object
        var node = this;
        // Event handler
        var handler = function(msg) {
            msg.topic = 'ctrl';
            node.receive(msg);
        }
        var event = node.topic;
        var context = node.context();
        var persist = node.persist;
        var state = context.get('state');
        
        if (!persist || typeof state === 'undefined') {
            state = node.defaultState;
        }
        context.set('state',state);
        // Show status
        status = (state === 'open') ? openStatus:closedStatus;
        node.status(status);
        // Deploy event handlers
        RED.events.setMaxListeners(30);
        RED.events.on('all',handler);
        RED.events.on(event,handler);
        // Process inputs
        node.on('input', function(msg) {
            state = context.get('state');
           // Change state
            if (msg.topic !== undefined && msg.topic.toLowerCase() === 'ctrl') {
                if (typeof msg.payload != 'string'){
                    node.error('Command must be a string');
                    } else {
                    switch (msg.payload.toLowerCase()) {
                        case node.openCmd:
                            state = 'open';
                            break;
                        case node.closeCmd:
                            state = 'closed';
                            break;
                        case node.toggleCmd:
                            if (state === 'open') {
                                state = 'closed';
                            } else {
                                state = 'open';
                            }
                            break;
                        case node.defaultCmd:
                            state = node.defaultState;
                            break;
                        default:
                            node.error('Invalid command');
                            break;
                    }
                    // Save state
                    context.set('state',state);
                    // Show status
                    status = (state === 'open') ? openStatus:closedStatus;
                    node.status(status);
                    node.send(null);
                }
            }
            // Transmit message
            else if (state === 'open') {
                    node.send(msg);
                } else {
                    node.send(null);
            }
        });
        
         this.on("close",function() {
            // Delete event handlers
            RED.events.removeListener(event,handler);
            RED.events.removeListener('all',handler);
        });
    }
    RED.nodes.registerType("rc-gate",RemoteGateNode);

    function GateControlNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.useMsgTopic = n.useMsgTopic;
        var node = this;
        var event = node.topic;
        this.on("input", function(msg) {
            msg._event = event;
            if (node.useMsgTopic) {
                event = msg.topic;
            }
            RED.events.emit(event,msg)
            this.send(msg);
        });
    }
    RED.nodes.registerType("gate-ctrl",GateControlNode);
}
