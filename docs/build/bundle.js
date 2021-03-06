
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function self(fn) {
        return function (event) {
            // @ts-ignore
            if (event.target === this)
                fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function flip(node, { from, to }, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        const dx = (from.left + from.width * ox / to.width) - (to.left + ox);
        const dy = (from.top + from.height * oy / to.height) - (to.top + oy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
            easing,
            css: (t, u) => {
                const x = u * dx;
                const y = u * dy;
                const sx = t + u * from.width / to.width;
                const sy = t + u * from.height / to.height;
                return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
            }
        };
    }

    /* src\components\Row.svelte generated by Svelte v3.46.4 */
    const file$5 = "src\\components\\Row.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (8:0) {#if letters}
    function create_if_block$1(ctx) {
    	let div;
    	let each_value = /*letters*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "row w-50 mb-1 row-cols-5 gx-2 svelte-i8o1ic");
    			add_location(div, file$5, 8, 2, 162);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*id, background, letters*/ 7) {
    				each_value = /*letters*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(8:0) {#if letters}",
    		ctx
    	});

    	return block;
    }

    // (10:4) {#each letters as letter, index}
    function create_each_block$1(ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*letter*/ ctx[3] + "";
    	let t0;
    	let div0_class_value;
    	let t1;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();

    			attr_dev(div0, "class", div0_class_value = "border " + (/*id*/ ctx[2] == /*index*/ ctx[5]
    			? /*background*/ ctx[0]
    			: '') + " rounded w-100 d-flex justify-content-center" + " svelte-i8o1ic");

    			add_location(div0, file$5, 11, 8, 283);
    			attr_dev(div1, "class", "col my-1");
    			add_location(div1, file$5, 10, 6, 251);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letters*/ 2 && t0_value !== (t0_value = /*letter*/ ctx[3] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*id, background*/ 5 && div0_class_value !== (div0_class_value = "border " + (/*id*/ ctx[2] == /*index*/ ctx[5]
    			? /*background*/ ctx[0]
    			: '') + " rounded w-100 d-flex justify-content-center" + " svelte-i8o1ic")) {
    				attr_dev(div0, "class", div0_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(10:4) {#each letters as letter, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let if_block_anchor;
    	let if_block = /*letters*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*letters*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Row', slots, []);
    	let { background = "" } = $$props;
    	let { letters } = $$props;
    	let { id } = $$props;
    	const writable_props = ['background', 'letters', 'id'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Row> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('background' in $$props) $$invalidate(0, background = $$props.background);
    		if ('letters' in $$props) $$invalidate(1, letters = $$props.letters);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({ background, letters, id, flip });

    	$$self.$inject_state = $$props => {
    		if ('background' in $$props) $$invalidate(0, background = $$props.background);
    		if ('letters' in $$props) $$invalidate(1, letters = $$props.letters);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [background, letters, id];
    }

    class Row extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { background: 0, letters: 1, id: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Row",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*letters*/ ctx[1] === undefined && !('letters' in props)) {
    			console.warn("<Row> was created without expected prop 'letters'");
    		}

    		if (/*id*/ ctx[2] === undefined && !('id' in props)) {
    			console.warn("<Row> was created without expected prop 'id'");
    		}
    	}

    	get background() {
    		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set background(value) {
    		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get letters() {
    		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set letters(value) {
    		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Rules.svelte generated by Svelte v3.46.4 */
    const file$4 = "src\\components\\Rules.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let p0;
    	let t1;
    	let p1;
    	let t3;
    	let p2;
    	let t5;
    	let hr;
    	let t6;
    	let row0;
    	let t7;
    	let p3;
    	let t9;
    	let row1;
    	let t10;
    	let p4;
    	let t12;
    	let row2;
    	let t13;
    	let p5;
    	let current;

    	row0 = new Row({
    			props: {
    				letters: /*words*/ ctx[0][0].split(''),
    				id: 0,
    				background: 'bg-success'
    			},
    			$$inline: true
    		});

    	row1 = new Row({
    			props: {
    				letters: /*words*/ ctx[0][1].split(''),
    				id: 1,
    				background: 'bg-warning'
    			},
    			$$inline: true
    		});

    	row2 = new Row({
    			props: {
    				letters: /*words*/ ctx[0][2].split(''),
    				id: 3,
    				background: 'bg-secondary'
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			p0.textContent = "Guess the WORDLE in six tries.";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "Each guess must be a valid five-letter word.Hit the enter button to submit.";
    			t3 = space();
    			p2 = element("p");
    			p2.textContent = "After each guess, the color of the tiles will change to show how close your\r\n    guess was to the word.";
    			t5 = space();
    			hr = element("hr");
    			t6 = text("\r\n  Examples\r\n  ");
    			create_component(row0.$$.fragment);
    			t7 = space();
    			p3 = element("p");
    			p3.textContent = "The letter A is in the word and in the correct spot.";
    			t9 = space();
    			create_component(row1.$$.fragment);
    			t10 = space();
    			p4 = element("p");
    			p4.textContent = "The letter O is in the word but in the wrong spot.";
    			t12 = space();
    			create_component(row2.$$.fragment);
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "The letter H is not in the word in any spot.";
    			add_location(p0, file$4, 8, 2, 176);
    			add_location(p1, file$4, 9, 2, 217);
    			add_location(p2, file$4, 12, 2, 313);
    			add_location(hr, file$4, 16, 2, 437);
    			add_location(p3, file$4, 19, 2, 532);
    			add_location(p4, file$4, 21, 2, 668);
    			add_location(p5, file$4, 23, 2, 804);
    			attr_dev(div, "class", "text-start");
    			add_location(div, file$4, 7, 0, 148);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(div, t1);
    			append_dev(div, p1);
    			append_dev(div, t3);
    			append_dev(div, p2);
    			append_dev(div, t5);
    			append_dev(div, hr);
    			append_dev(div, t6);
    			mount_component(row0, div, null);
    			append_dev(div, t7);
    			append_dev(div, p3);
    			append_dev(div, t9);
    			mount_component(row1, div, null);
    			append_dev(div, t10);
    			append_dev(div, p4);
    			append_dev(div, t12);
    			mount_component(row2, div, null);
    			append_dev(div, t13);
    			append_dev(div, p5);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(row0.$$.fragment, local);
    			transition_in(row1.$$.fragment, local);
    			transition_in(row2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(row0.$$.fragment, local);
    			transition_out(row1.$$.fragment, local);
    			transition_out(row2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(row0);
    			destroy_component(row1);
    			destroy_component(row2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Rules', slots, []);
    	let words = ['APPLE', 'WORRY', 'LIGHT'];
    	let id = 0;
    	let background = 'bg-primary';
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Rules> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Row, words, id, background });

    	$$self.$inject_state = $$props => {
    		if ('words' in $$props) $$invalidate(0, words = $$props.words);
    		if ('id' in $$props) id = $$props.id;
    		if ('background' in $$props) background = $$props.background;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [words];
    }

    class Rules extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rules",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\elements\Toggle.svelte generated by Svelte v3.46.4 */

    const file$3 = "src\\elements\\Toggle.svelte";

    function create_fragment$3(ctx) {
    	let label;
    	let input;
    	let t0;
    	let div3;
    	let div2;
    	let div0;
    	let p0;
    	let t1;
    	let t2;
    	let div1;
    	let p1;
    	let t3;
    	let label_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t1 = text(/*onText*/ ctx[1]);
    			t2 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t3 = text(/*offText*/ ctx[2]);
    			attr_dev(input, "class", "toggle__input svelte-1m67w4x");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "mytoggle");
    			add_location(input, file$3, 18, 2, 567);
    			attr_dev(p0, "class", "svelte-1m67w4x");
    			add_location(p0, file$3, 26, 26, 789);
    			attr_dev(div0, "class", "on col");
    			add_location(div0, file$3, 26, 6, 769);
    			attr_dev(p1, "class", "svelte-1m67w4x");
    			add_location(p1, file$3, 27, 27, 839);
    			attr_dev(div1, "class", "off col");
    			add_location(div1, file$3, 27, 6, 818);
    			attr_dev(div2, "class", "row g-0 h-100 mw-50 text-center");
    			add_location(div2, file$3, 25, 4, 716);
    			attr_dev(div3, "class", "toggle__fill  svelte-1m67w4x");
    			add_location(div3, file$3, 24, 2, 683);
    			attr_dev(label, "class", label_class_value = "toggle " + /*className*/ ctx[8] + " svelte-1m67w4x");
    			attr_dev(label, "for", "mytoggle");
    			set_style(label, "--width", /*width*/ ctx[7]);
    			set_style(label, "--onColor", /*onColor*/ ctx[4]);
    			set_style(label, "--offColor", /*offColor*/ ctx[3]);
    			set_style(label, "--switchColor", /*switchColor*/ ctx[5]);
    			set_style(label, "--switchBorderColor", /*swithBorderColor*/ ctx[6]);
    			add_location(label, file$3, 13, 0, 361);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = /*checkedValue*/ ctx[0];
    			append_dev(label, t0);
    			append_dev(label, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t3);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*checkedValue*/ 1) {
    				input.checked = /*checkedValue*/ ctx[0];
    			}

    			if (dirty & /*onText*/ 2) set_data_dev(t1, /*onText*/ ctx[1]);
    			if (dirty & /*offText*/ 4) set_data_dev(t3, /*offText*/ ctx[2]);

    			if (dirty & /*className*/ 256 && label_class_value !== (label_class_value = "toggle " + /*className*/ ctx[8] + " svelte-1m67w4x")) {
    				attr_dev(label, "class", label_class_value);
    			}

    			if (dirty & /*width*/ 128) {
    				set_style(label, "--width", /*width*/ ctx[7]);
    			}

    			if (dirty & /*onColor*/ 16) {
    				set_style(label, "--onColor", /*onColor*/ ctx[4]);
    			}

    			if (dirty & /*offColor*/ 8) {
    				set_style(label, "--offColor", /*offColor*/ ctx[3]);
    			}

    			if (dirty & /*switchColor*/ 32) {
    				set_style(label, "--switchColor", /*switchColor*/ ctx[5]);
    			}

    			if (dirty & /*swithBorderColor*/ 64) {
    				set_style(label, "--switchBorderColor", /*swithBorderColor*/ ctx[6]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Toggle', slots, []);
    	let { onText = '' } = $$props;
    	let { offText = '' } = $$props;
    	let { offColor = 'white' } = $$props;
    	let { onColor = 'gray' } = $$props;
    	let { switchColor = '#380101' } = $$props;
    	let { swithBorderColor = 'red' } = $$props;
    	let { width = '40px' } = $$props;
    	let { checkedValue = false } = $$props;
    	let { className = '' } = $$props;

    	const writable_props = [
    		'onText',
    		'offText',
    		'offColor',
    		'onColor',
    		'switchColor',
    		'swithBorderColor',
    		'width',
    		'checkedValue',
    		'className'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Toggle> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		checkedValue = this.checked;
    		$$invalidate(0, checkedValue);
    	}

    	$$self.$$set = $$props => {
    		if ('onText' in $$props) $$invalidate(1, onText = $$props.onText);
    		if ('offText' in $$props) $$invalidate(2, offText = $$props.offText);
    		if ('offColor' in $$props) $$invalidate(3, offColor = $$props.offColor);
    		if ('onColor' in $$props) $$invalidate(4, onColor = $$props.onColor);
    		if ('switchColor' in $$props) $$invalidate(5, switchColor = $$props.switchColor);
    		if ('swithBorderColor' in $$props) $$invalidate(6, swithBorderColor = $$props.swithBorderColor);
    		if ('width' in $$props) $$invalidate(7, width = $$props.width);
    		if ('checkedValue' in $$props) $$invalidate(0, checkedValue = $$props.checkedValue);
    		if ('className' in $$props) $$invalidate(8, className = $$props.className);
    	};

    	$$self.$capture_state = () => ({
    		onText,
    		offText,
    		offColor,
    		onColor,
    		switchColor,
    		swithBorderColor,
    		width,
    		checkedValue,
    		className
    	});

    	$$self.$inject_state = $$props => {
    		if ('onText' in $$props) $$invalidate(1, onText = $$props.onText);
    		if ('offText' in $$props) $$invalidate(2, offText = $$props.offText);
    		if ('offColor' in $$props) $$invalidate(3, offColor = $$props.offColor);
    		if ('onColor' in $$props) $$invalidate(4, onColor = $$props.onColor);
    		if ('switchColor' in $$props) $$invalidate(5, switchColor = $$props.switchColor);
    		if ('swithBorderColor' in $$props) $$invalidate(6, swithBorderColor = $$props.swithBorderColor);
    		if ('width' in $$props) $$invalidate(7, width = $$props.width);
    		if ('checkedValue' in $$props) $$invalidate(0, checkedValue = $$props.checkedValue);
    		if ('className' in $$props) $$invalidate(8, className = $$props.className);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		checkedValue,
    		onText,
    		offText,
    		offColor,
    		onColor,
    		switchColor,
    		swithBorderColor,
    		width,
    		className,
    		input_change_handler
    	];
    }

    class Toggle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			onText: 1,
    			offText: 2,
    			offColor: 3,
    			onColor: 4,
    			switchColor: 5,
    			swithBorderColor: 6,
    			width: 7,
    			checkedValue: 0,
    			className: 8
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toggle",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get onText() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onText(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offText() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offText(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offColor() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offColor(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onColor() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onColor(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get switchColor() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set switchColor(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get swithBorderColor() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set swithBorderColor(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get checkedValue() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checkedValue(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get className() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set className(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\elements\WordleModal.svelte generated by Svelte v3.46.4 */

    const file$2 = "src\\elements\\WordleModal.svelte";

    function create_fragment$2(ctx) {
    	let div4;
    	let div3;
    	let p0;
    	let t0;
    	let t1;
    	let p0_class_value;
    	let t2;
    	let p1;
    	let t3;
    	let p1_class_value;
    	let t4;
    	let div0;
    	let t5;
    	let div2;
    	let div1;
    	let t6;
    	let div1_class_value;
    	let div3_class_value;
    	let div4_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			p0 = element("p");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = text("!");
    			t2 = space();
    			p1 = element("p");
    			t3 = text(/*subtitle*/ ctx[1]);
    			t4 = space();
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t5 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t6 = text("Cancel");
    			attr_dev(p0, "class", p0_class_value = "text-center fs-1 m-0 fw-bolder " + /*titleColor*/ ctx[4] + "" + " svelte-1fbh6cj");
    			add_location(p0, file$2, 34, 4, 1031);
    			attr_dev(p1, "class", p1_class_value = "text-center fs-4 mb-0 fw-light " + /*subtitleColor*/ ctx[5] + " svelte-1fbh6cj");
    			add_location(p1, file$2, 36, 4, 1130);
    			attr_dev(div0, "class", "p-2 text-center");
    			add_location(div0, file$2, 38, 4, 1233);
    			attr_dev(div1, "class", div1_class_value = "btn " + /*buttonColor*/ ctx[6] + " svelte-1fbh6cj");
    			attr_dev(div1, "type", "");
    			add_location(div1, file$2, 45, 6, 1462);
    			attr_dev(div2, "class", "d-flex justify-content-end m-2");
    			add_location(div2, file$2, 42, 4, 1331);
    			attr_dev(div3, "class", div3_class_value = "w-50 mh-75 overflow-auto " + /*backgroundColor*/ ctx[7] + " rounded position-absolute start-25 top-15" + " svelte-1fbh6cj");
    			add_location(div3, file$2, 30, 2, 890);
    			attr_dev(div4, "class", div4_class_value = "body " + (/*display*/ ctx[9] ? '' : 'd-none') + " position-absolute top-0 start-0 w-100 h-100 " + /*className*/ ctx[8] + " svelte-1fbh6cj");
    			add_location(div4, file$2, 18, 0, 634);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, p0);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(div3, t2);
    			append_dev(div3, p1);
    			append_dev(p1, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, t6);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keydown", /*keydown_handler*/ ctx[13], false, false, false),
    					listen_dev(div1, "click", /*click_handler*/ ctx[14], false, false, false),
    					listen_dev(div4, "click", self(/*click_handler_1*/ ctx[15]), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);

    			if (!current || dirty & /*titleColor*/ 16 && p0_class_value !== (p0_class_value = "text-center fs-1 m-0 fw-bolder " + /*titleColor*/ ctx[4] + "" + " svelte-1fbh6cj")) {
    				attr_dev(p0, "class", p0_class_value);
    			}

    			if (!current || dirty & /*subtitle*/ 2) set_data_dev(t3, /*subtitle*/ ctx[1]);

    			if (!current || dirty & /*subtitleColor*/ 32 && p1_class_value !== (p1_class_value = "text-center fs-4 mb-0 fw-light " + /*subtitleColor*/ ctx[5] + " svelte-1fbh6cj")) {
    				attr_dev(p1, "class", p1_class_value);
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[11],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*buttonColor*/ 64 && div1_class_value !== (div1_class_value = "btn " + /*buttonColor*/ ctx[6] + " svelte-1fbh6cj")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (!current || dirty & /*backgroundColor*/ 128 && div3_class_value !== (div3_class_value = "w-50 mh-75 overflow-auto " + /*backgroundColor*/ ctx[7] + " rounded position-absolute start-25 top-15" + " svelte-1fbh6cj")) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (!current || dirty & /*display, className*/ 768 && div4_class_value !== (div4_class_value = "body " + (/*display*/ ctx[9] ? '' : 'd-none') + " position-absolute top-0 start-0 w-100 h-100 " + /*className*/ ctx[8] + " svelte-1fbh6cj")) {
    				attr_dev(div4, "class", div4_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WordleModal', slots, ['default']);
    	let display = true;
    	let { title = "Title" } = $$props;
    	let { subtitle = "Subtitle" } = $$props;
    	let { titleColor = "" } = $$props;
    	let { subtitleColor = "" } = $$props;
    	let { buttonColor = "btn-secondary" } = $$props;
    	let { backgroundColor = "bg-black text-white" } = $$props;
    	let { modalName = "" } = $$props;
    	let { className = "bg-gray" } = $$props;
    	let { openModal = false } = $$props;

    	const modalHandeller = event => {
    		event.key === 'Enter'
    		? $$invalidate(3, openModal = !openModal)
    		: '';
    	};

    	const writable_props = [
    		'title',
    		'subtitle',
    		'titleColor',
    		'subtitleColor',
    		'buttonColor',
    		'backgroundColor',
    		'modalName',
    		'className',
    		'openModal'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WordleModal> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = event => modalHandeller(event);

    	const click_handler = () => {
    		$$invalidate(9, display = false);
    		$$invalidate(3, openModal = false);
    		$$invalidate(0, title = '');
    		$$invalidate(1, subtitle = '');
    		$$invalidate(2, modalName = '');
    	};

    	const click_handler_1 = () => {
    		$$invalidate(9, display = false);
    		$$invalidate(3, openModal = false);
    		$$invalidate(0, title = '');
    		$$invalidate(1, subtitle = '');
    		$$invalidate(2, modalName = '');
    	};

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(1, subtitle = $$props.subtitle);
    		if ('titleColor' in $$props) $$invalidate(4, titleColor = $$props.titleColor);
    		if ('subtitleColor' in $$props) $$invalidate(5, subtitleColor = $$props.subtitleColor);
    		if ('buttonColor' in $$props) $$invalidate(6, buttonColor = $$props.buttonColor);
    		if ('backgroundColor' in $$props) $$invalidate(7, backgroundColor = $$props.backgroundColor);
    		if ('modalName' in $$props) $$invalidate(2, modalName = $$props.modalName);
    		if ('className' in $$props) $$invalidate(8, className = $$props.className);
    		if ('openModal' in $$props) $$invalidate(3, openModal = $$props.openModal);
    		if ('$$scope' in $$props) $$invalidate(11, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		display,
    		title,
    		subtitle,
    		titleColor,
    		subtitleColor,
    		buttonColor,
    		backgroundColor,
    		modalName,
    		className,
    		openModal,
    		modalHandeller
    	});

    	$$self.$inject_state = $$props => {
    		if ('display' in $$props) $$invalidate(9, display = $$props.display);
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(1, subtitle = $$props.subtitle);
    		if ('titleColor' in $$props) $$invalidate(4, titleColor = $$props.titleColor);
    		if ('subtitleColor' in $$props) $$invalidate(5, subtitleColor = $$props.subtitleColor);
    		if ('buttonColor' in $$props) $$invalidate(6, buttonColor = $$props.buttonColor);
    		if ('backgroundColor' in $$props) $$invalidate(7, backgroundColor = $$props.backgroundColor);
    		if ('modalName' in $$props) $$invalidate(2, modalName = $$props.modalName);
    		if ('className' in $$props) $$invalidate(8, className = $$props.className);
    		if ('openModal' in $$props) $$invalidate(3, openModal = $$props.openModal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		title,
    		subtitle,
    		modalName,
    		openModal,
    		titleColor,
    		subtitleColor,
    		buttonColor,
    		backgroundColor,
    		className,
    		display,
    		modalHandeller,
    		$$scope,
    		slots,
    		keydown_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class WordleModal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			title: 0,
    			subtitle: 1,
    			titleColor: 4,
    			subtitleColor: 5,
    			buttonColor: 6,
    			backgroundColor: 7,
    			modalName: 2,
    			className: 8,
    			openModal: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WordleModal",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get title() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get subtitle() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set subtitle(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get titleColor() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set titleColor(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get subtitleColor() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set subtitleColor(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get buttonColor() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set buttonColor(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get backgroundColor() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set backgroundColor(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get modalName() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set modalName(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get className() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set className(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get openModal() {
    		throw new Error("<WordleModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set openModal(value) {
    		throw new Error("<WordleModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const falseArray = ['A', 'B', 'C', 'D', 'E', 'F'];
    const charSet = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['reset', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Enter']
    ];
    const possibilities = [
      'cigar',
      'rebut',
      'sissy',
      'humph',
      'awake',
      'blush',
      'focal',
      'evade',
      'naval',
      'serve',
      'heath',
      'dwarf',
      'model',
      'karma',
      'stink',
      'grade',
      'quiet',
      'bench',
      'abate',
      'feign',
      'major',
      'death',
      'fresh',
      'crust',
      'stool',
      'colon',
      'abase',
      'marry',
      'floss',
      'batty',
      'pride',
      'light',
      'helix',
      'croak',
      'staff',
      'paper',
      'unfed',
      'whelp',
      'trawl',
      'outdo',
      'adobe',
      'crazy',
      'sower',
      'repay',
      'digit',
      'crate',
      'cluck',
      'spike',
      'mimic',
      'pound',
      'maxim',
      'linen',
      'unmet',
      'flesh',
      'booby',
      'forth',
      'first',
      'stand',
      'belly',
      'ivory',
      'seedy',
      'print',
      'yearn',
      'drain',
      'bribe',
      'stout',
      'panel',
      'crass',
      'flume',
      'offal',
      'agree',
      'error',
      'swirl',
      'argue',
      'bleed',
      'delta',
      'flick',
      'totem',
      'wooer',
      'front',
      'shrub',
      'parry',
      'biome',
      'lapel',
      'start',
      'greet',
      'goner',
      'golem',
      'lusty',
      'loopy',
      'round',
      'audit',
      'lying',
      'gamma',
      'labor',
      'islet',
      'civic',
      'forge',
      'corny',
      'moult',
      'basic',
      'salad',
      'agate',
      'spicy',
      'spray',
      'essay',
      'fjord',
      'spend',
      'kebab',
      'guild',
      'aback',
      'motor',
      'alone',
      'hatch',
      'hyper',
      'thumb',
      'dowry',
      'ought',
      'belch',
      'dutch',
      'pilot',
      'tweed',
      'comet',
      'jaunt',
      'enema',
      'steed',
      'abyss',
      'growl',
      'fling',
      'dozen',
      'boozy',
      'erode',
      'world',
      'gouge',
      'click',
      'briar',
      'great',
      'altar',
      'pulpy',
      'blurt',
      'coast',
      'duchy',
      'groin',
      'fixer',
      'group',
      'rogue',
      'badly',
      'smart',
      'pithy',
      'gaudy',
      'chill',
      'heron',
      'vodka',
      'finer',
      'surer',
      'radio',
      'rouge',
      'perch',
      'retch',
      'wrote',
      'clock',
      'tilde',
      'store',
      'prove',
      'bring',
      'solve',
      'cheat',
      'grime',
      'exult',
      'usher',
      'epoch',
      'triad',
      'break',
      'rhino',
      'viral',
      'conic',
      'masse',
      'sonic',
      'vital',
      'trace',
      'using',
      'peach',
      'champ',
      'baton',
      'brake',
      'pluck',
      'craze',
      'gripe',
      'weary',
      'picky',
      'acute',
      'ferry',
      'aside',
      'tapir',
      'troll',
      'unify',
      'rebus',
      'boost',
      'truss',
      'siege',
      'tiger',
      'banal',
      'slump',
      'crank',
      'gorge',
      'query',
      'drink',
      'favor',
      'abbey',
      'tangy',
      'panic',
      'solar',
      'shire',
      'proxy',
      'point',
      'robot',
      'prick',
      'wince',
      'crimp',
      'knoll',
      'sugar',
      'whack',
      'mount',
      'perky',
      'could',
      'wrung',
      'react',
      'those',
      'moist',
      'shard',
      'pleat',
      'aloft',
      'skill',
      'elder',
      'frame',
      'humor',
      'pause',
      'ulcer',
      'ultra',
      'robin',
      'cynic',
      'agora',
      'aroma',
      'caulk',
      'shake',
      'pupal',
      'dodge',
      'swill',
      'tacit',
      'other',
      'thorn',
      'trove',
      'bloke',
      'vivid',
      'spill',
      'chant',
      'choke',
      'rupee',
      'nasty',
      'mourn',
      'ahead',
      'brine',
      'cloth',
      'hoard',
      'sweet',
      'month',
      'lapse',
      'watch',
      'today',
      'focus',
      'smelt',
      'tease',
      'cater',
      'movie',
      'lynch',
      'saute',
      'allow',
      'renew',
      'their',
      'slosh',
      'purge',
      'chest',
      'depot',
      'epoxy',
      'nymph',
      'found',
      'shall',
      'harry',
      'stove',
      'lowly',
      'snout',
      'trope',
      'fewer',
      'shawl',
      'natal',
      'fibre',
      'comma',
      'foray',
      'scare',
      'stair',
      'black',
      'squad',
      'royal',
      'chunk',
      'mince',
      'slave',
      'shame',
      'cheek',
      'ample',
      'flair',
      'foyer',
      'cargo',
      'oxide',
      'plant',
      'olive',
      'inert',
      'askew',
      'heist',
      'shown',
      'zesty',
      'hasty',
      'trash',
      'fella',
      'larva',
      'forgo',
      'story',
      'hairy',
      'train',
      'homer',
      'badge',
      'midst',
      'canny',
      'fetus',
      'butch',
      'farce',
      'slung',
      'tipsy',
      'metal',
      'yield',
      'delve',
      'being',
      'scour',
      'glass',
      'gamer',
      'scrap',
      'money',
      'hinge',
      'album',
      'vouch',
      'asset',
      'tiara',
      'crept',
      'bayou',
      'atoll',
      'manor',
      'creak',
      'showy',
      'phase',
      'froth',
      'depth',
      'gloom',
      'flood',
      'trait',
      'girth',
      'piety',
      'payer',
      'goose',
      'float',
      'donor',
      'atone',
      'primo',
      'apron',
      'blown',
      'cacao',
      'loser',
      'input',
      'gloat',
      'awful',
      'brink',
      'smite',
      'beady',
      'rusty',
      'retro',
      'droll',
      'gawky',
      'hutch',
      'pinto',
      'gaily',
      'egret',
      'lilac',
      'sever',
      'field',
      'fluff',
      'hydro',
      'flack',
      'agape',
      'wench',
      'voice',
      'stead',
      'stalk',
      'berth',
      'madam',
      'night',
      'bland',
      'liver',
      'wedge',
      'augur',
      'roomy',
      'wacky',
      'flock',
      'angry',
      'bobby',
      'trite',
      'aphid',
      'tryst',
      'midge',
      'power',
      'elope',
      'cinch',
      'motto',
      'stomp',
      'upset',
      'bluff',
      'cramp',
      'quart',
      'coyly',
      'youth',
      'rhyme',
      'buggy',
      'alien',
      'smear',
      'unfit',
      'patty',
      'cling',
      'glean',
      'label',
      'hunky',
      'khaki',
      'poker',
      'gruel',
      'twice',
      'twang',
      'shrug',
      'treat',
      'unlit',
      'waste',
      'merit',
      'woven',
      'octal',
      'needy',
      'clown',
      'widow',
      'irony',
      'ruder',
      'gauze',
      'chief',
      'onset',
      'prize',
      'fungi',
      'charm',
      'gully',
      'inter',
      'whoop',
      'taunt',
      'leery',
      'class',
      'theme',
      'lofty',
      'tibia',
      'booze',
      'alpha',
      'thyme',
      'eclat',
      'doubt',
      'parer',
      'chute',
      'stick',
      'trice',
      'alike',
      'sooth',
      'recap',
      'saint',
      'liege',
      'glory',
      'grate',
      'admit',
      'brisk',
      'soggy',
      'usurp',
      'scald',
      'scorn',
      'leave',
      'twine',
      'sting',
      'bough',
      'marsh',
      'sloth',
      'dandy',
      'vigor',
      'howdy',
      'enjoy',
      'valid',
      'ionic',
      'equal',
      'unset',
      'floor',
      'catch',
      'spade',
      'stein',
      'exist',
      'quirk',
      'denim',
      'grove',
      'spiel',
      'mummy',
      'fault',
      'foggy',
      'flout',
      'carry',
      'sneak',
      'libel',
      'waltz',
      'aptly',
      'piney',
      'inept',
      'aloud',
      'photo',
      'dream',
      'stale',
      'vomit',
      'ombre',
      'fanny',
      'unite',
      'snarl',
      'baker',
      'there',
      'glyph',
      'pooch',
      'hippy',
      'spell',
      'folly',
      'louse',
      'gulch',
      'vault',
      'godly',
      'threw',
      'fleet',
      'grave',
      'inane',
      'shock',
      'crave',
      'spite',
      'valve',
      'skimp',
      'claim',
      'rainy',
      'musty',
      'pique',
      'daddy',
      'quasi',
      'arise',
      'aging',
      'valet',
      'opium',
      'avert',
      'stuck',
      'recut',
      'mulch',
      'genre',
      'plume',
      'rifle',
      'count',
      'incur',
      'total',
      'wrest',
      'mocha',
      'deter',
      'study',
      'lover',
      'safer',
      'rivet',
      'funny',
      'smoke',
      'mound',
      'undue',
      'sedan',
      'pagan',
      'swine',
      'guile',
      'gusty',
      'equip',
      'tough',
      'canoe',
      'chaos',
      'covet',
      'human',
      'udder',
      'lunch',
      'blast',
      'stray',
      'manga',
      'melee',
      'lefty',
      'quick',
      'paste',
      'given',
      'octet',
      'risen',
      'groan',
      'leaky',
      'grind',
      'carve',
      'loose',
      'sadly',
      'spilt',
      'apple',
      'slack',
      'honey',
      'final',
      'sheen',
      'eerie',
      'minty',
      'slick',
      'derby',
      'wharf',
      'spelt',
      'coach',
      'erupt',
      'singe',
      'price',
      'spawn',
      'fairy',
      'jiffy',
      'filmy',
      'stack',
      'chose',
      'sleep',
      'ardor',
      'nanny',
      'niece',
      'woozy',
      'handy',
      'grace',
      'ditto',
      'stank',
      'cream',
      'usual',
      'diode',
      'valor',
      'angle',
      'ninja',
      'muddy',
      'chase',
      'reply',
      'prone',
      'spoil',
      'heart',
      'shade',
      'diner',
      'arson',
      'onion',
      'sleet',
      'dowel',
      'couch',
      'palsy',
      'bowel',
      'smile',
      'evoke',
      'creek',
      'lance',
      'eagle',
      'idiot',
      'siren',
      'built',
      'embed',
      'award',
      'dross',
      'annul',
      'goody',
      'frown',
      'patio',
      'laden',
      'humid',
      'elite',
      'lymph',
      'edify',
      'might',
      'reset',
      'visit',
      'gusto',
      'purse',
      'vapor',
      'crock',
      'write',
      'sunny',
      'loath',
      'chaff',
      'slide',
      'queer',
      'venom',
      'stamp',
      'sorry',
      'still',
      'acorn',
      'aping',
      'pushy',
      'tamer',
      'hater',
      'mania',
      'awoke',
      'brawn',
      'swift',
      'exile',
      'birch',
      'lucky',
      'freer',
      'risky',
      'ghost',
      'plier',
      'lunar',
      'winch',
      'snare',
      'nurse',
      'house',
      'borax',
      'nicer',
      'lurch',
      'exalt',
      'about',
      'savvy',
      'toxin',
      'tunic',
      'pried',
      'inlay',
      'chump',
      'lanky',
      'cress',
      'eater',
      'elude',
      'cycle',
      'kitty',
      'boule',
      'moron',
      'tenet',
      'place',
      'lobby',
      'plush',
      'vigil',
      'index',
      'blink',
      'clung',
      'qualm',
      'croup',
      'clink',
      'juicy',
      'stage',
      'decay',
      'nerve',
      'flier',
      'shaft',
      'crook',
      'clean',
      'china',
      'ridge',
      'vowel',
      'gnome',
      'snuck',
      'icing',
      'spiny',
      'rigor',
      'snail',
      'flown',
      'rabid',
      'prose',
      'thank',
      'poppy',
      'budge',
      'fiber',
      'moldy',
      'dowdy',
      'kneel',
      'track',
      'caddy',
      'quell',
      'dumpy',
      'paler',
      'swore',
      'rebar',
      'scuba',
      'splat',
      'flyer',
      'horny',
      'mason',
      'doing',
      'ozone',
      'amply',
      'molar',
      'ovary',
      'beset',
      'queue',
      'cliff',
      'magic',
      'truce',
      'sport',
      'fritz',
      'edict',
      'twirl',
      'verse',
      'llama',
      'eaten',
      'range',
      'whisk',
      'hovel',
      'rehab',
      'macaw',
      'sigma',
      'spout',
      'verve',
      'sushi',
      'dying',
      'fetid',
      'brain',
      'buddy',
      'thump',
      'scion',
      'candy',
      'chord',
      'basin',
      'march',
      'crowd',
      'arbor',
      'gayly',
      'musky',
      'stain',
      'dally',
      'bless',
      'bravo',
      'stung',
      'title',
      'ruler',
      'kiosk',
      'blond',
      'ennui',
      'layer',
      'fluid',
      'tatty',
      'score',
      'cutie',
      'zebra',
      'barge',
      'matey',
      'bluer',
      'aider',
      'shook',
      'river',
      'privy',
      'betel',
      'frisk',
      'bongo',
      'begun',
      'azure',
      'weave',
      'genie',
      'sound',
      'glove',
      'braid',
      'scope',
      'wryly',
      'rover',
      'assay',
      'ocean',
      'bloom',
      'irate',
      'later',
      'woken',
      'silky',
      'wreck',
      'dwelt',
      'slate',
      'smack',
      'solid',
      'amaze',
      'hazel',
      'wrist',
      'jolly',
      'globe',
      'flint',
      'rouse',
      'civil',
      'vista',
      'relax',
      'cover',
      'alive',
      'beech',
      'jetty',
      'bliss',
      'vocal',
      'often',
      'dolly',
      'eight',
      'joker',
      'since',
      'event',
      'ensue',
      'shunt',
      'diver',
      'poser',
      'worst',
      'sweep',
      'alley',
      'creed',
      'anime',
      'leafy',
      'bosom',
      'dunce',
      'stare',
      'pudgy',
      'waive',
      'choir',
      'stood',
      'spoke',
      'outgo',
      'delay',
      'bilge',
      'ideal',
      'clasp',
      'seize',
      'hotly',
      'laugh',
      'sieve',
      'block',
      'meant',
      'grape',
      'noose',
      'hardy',
      'shied',
      'drawl',
      'daisy',
      'putty',
      'strut',
      'burnt',
      'tulip',
      'crick',
      'idyll',
      'vixen',
      'furor',
      'geeky',
      'cough',
      'naive',
      'shoal',
      'stork',
      'bathe',
      'aunty',
      'check',
      'prime',
      'brass',
      'outer',
      'furry',
      'razor',
      'elect',
      'evict',
      'imply',
      'demur',
      'quota',
      'haven',
      'cavil',
      'swear',
      'crump',
      'dough',
      'gavel',
      'wagon',
      'salon',
      'nudge',
      'harem',
      'pitch',
      'sworn',
      'pupil',
      'excel',
      'stony',
      'cabin',
      'unzip',
      'queen',
      'trout',
      'polyp',
      'earth',
      'storm',
      'until',
      'taper',
      'enter',
      'child',
      'adopt',
      'minor',
      'fatty',
      'husky',
      'brave',
      'filet',
      'slime',
      'glint',
      'tread',
      'steal',
      'regal',
      'guest',
      'every',
      'murky',
      'share',
      'spore',
      'hoist',
      'buxom',
      'inner',
      'otter',
      'dimly',
      'level',
      'sumac',
      'donut',
      'stilt',
      'arena',
      'sheet',
      'scrub',
      'fancy',
      'slimy',
      'pearl',
      'silly',
      'porch',
      'dingo',
      'sepia',
      'amble',
      'shady',
      'bread',
      'friar',
      'reign',
      'dairy',
      'quill',
      'cross',
      'brood',
      'tuber',
      'shear',
      'posit',
      'blank',
      'villa',
      'shank',
      'piggy',
      'freak',
      'which',
      'among',
      'fecal',
      'shell',
      'would',
      'algae',
      'large',
      'rabbi',
      'agony',
      'amuse',
      'bushy',
      'copse',
      'swoon',
      'knife',
      'pouch',
      'ascot',
      'plane',
      'crown',
      'urban',
      'snide',
      'relay',
      'abide',
      'viola',
      'rajah',
      'straw',
      'dilly',
      'crash',
      'amass',
      'third',
      'trick',
      'tutor',
      'woody',
      'blurb',
      'grief',
      'disco',
      'where',
      'sassy',
      'beach',
      'sauna',
      'comic',
      'clued',
      'creep',
      'caste',
      'graze',
      'snuff',
      'frock',
      'gonad',
      'drunk',
      'prong',
      'lurid',
      'steel',
      'halve',
      'buyer',
      'vinyl',
      'utile',
      'smell',
      'adage',
      'worry',
      'tasty',
      'local',
      'trade',
      'finch',
      'ashen',
      'modal',
      'gaunt',
      'clove',
      'enact',
      'adorn',
      'roast',
      'speck',
      'sheik',
      'missy',
      'grunt',
      'snoop',
      'party',
      'touch',
      'mafia',
      'emcee',
      'array',
      'south',
      'vapid',
      'jelly',
      'skulk',
      'angst',
      'tubal',
      'lower',
      'crest',
      'sweat',
      'cyber',
      'adore',
      'tardy',
      'swami',
      'notch',
      'groom',
      'roach',
      'hitch',
      'young',
      'align',
      'ready',
      'frond',
      'strap',
      'puree',
      'realm',
      'venue',
      'swarm',
      'offer',
      'seven',
      'dryer',
      'diary',
      'dryly',
      'drank',
      'acrid',
      'heady',
      'theta',
      'junto',
      'pixie',
      'quoth',
      'bonus',
      'shalt',
      'penne',
      'amend',
      'datum',
      'build',
      'piano',
      'shelf',
      'lodge',
      'suing',
      'rearm',
      'coral',
      'ramen',
      'worth',
      'psalm',
      'infer',
      'overt',
      'mayor',
      'ovoid',
      'glide',
      'usage',
      'poise',
      'randy',
      'chuck',
      'prank',
      'fishy',
      'tooth',
      'ether',
      'drove',
      'idler',
      'swath',
      'stint',
      'while',
      'begat',
      'apply',
      'slang',
      'tarot',
      'radar',
      'credo',
      'aware',
      'canon',
      'shift',
      'timer',
      'bylaw',
      'serum',
      'three',
      'steak',
      'iliac',
      'shirk',
      'blunt',
      'puppy',
      'penal',
      'joist',
      'bunny',
      'shape',
      'beget',
      'wheel',
      'adept',
      'stunt',
      'stole',
      'topaz',
      'chore',
      'fluke',
      'afoot',
      'bloat',
      'bully',
      'dense',
      'caper',
      'sneer',
      'boxer',
      'jumbo',
      'lunge',
      'space',
      'avail',
      'short',
      'slurp',
      'loyal',
      'flirt',
      'pizza',
      'conch',
      'tempo',
      'droop',
      'plate',
      'bible',
      'plunk',
      'afoul',
      'savoy',
      'steep',
      'agile',
      'stake',
      'dwell',
      'knave',
      'beard',
      'arose',
      'motif',
      'smash',
      'broil',
      'glare',
      'shove',
      'baggy',
      'mammy',
      'swamp',
      'along',
      'rugby',
      'wager',
      'quack',
      'squat',
      'snaky',
      'debit',
      'mange',
      'skate',
      'ninth',
      'joust',
      'tramp',
      'spurn',
      'medal',
      'micro',
      'rebel',
      'flank',
      'learn',
      'nadir',
      'maple',
      'comfy',
      'remit',
      'gruff',
      'ester',
      'least',
      'mogul',
      'fetch',
      'cause',
      'oaken',
      'aglow',
      'meaty',
      'gaffe',
      'shyly',
      'racer',
      'prowl',
      'thief',
      'stern',
      'poesy',
      'rocky',
      'tweet',
      'waist',
      'spire',
      'grope',
      'havoc',
      'patsy',
      'truly',
      'forty',
      'deity',
      'uncle',
      'swish',
      'giver',
      'preen',
      'bevel',
      'lemur',
      'draft',
      'slope',
      'annoy',
      'lingo',
      'bleak',
      'ditty',
      'curly',
      'cedar',
      'dirge',
      'grown',
      'horde',
      'drool',
      'shuck',
      'crypt',
      'cumin',
      'stock',
      'gravy',
      'locus',
      'wider',
      'breed',
      'quite',
      'chafe',
      'cache',
      'blimp',
      'deign',
      'fiend',
      'logic',
      'cheap',
      'elide',
      'rigid',
      'false',
      'renal',
      'pence',
      'rowdy',
      'shoot',
      'blaze',
      'envoy',
      'posse',
      'brief',
      'never',
      'abort',
      'mouse',
      'mucky',
      'sulky',
      'fiery',
      'media',
      'trunk',
      'yeast',
      'clear',
      'skunk',
      'scalp',
      'bitty',
      'cider',
      'koala',
      'duvet',
      'segue',
      'creme',
      'super',
      'grill',
      'after',
      'owner',
      'ember',
      'reach',
      'nobly',
      'empty',
      'speed',
      'gipsy',
      'recur',
      'smock',
      'dread',
      'merge',
      'burst',
      'kappa',
      'amity',
      'shaky',
      'hover',
      'carol',
      'snort',
      'synod',
      'faint',
      'haunt',
      'flour',
      'chair',
      'detox',
      'shrew',
      'tense',
      'plied',
      'quark',
      'burly',
      'novel',
      'waxen',
      'stoic',
      'jerky',
      'blitz',
      'beefy',
      'lyric',
      'hussy',
      'towel',
      'quilt',
      'below',
      'bingo',
      'wispy',
      'brash',
      'scone',
      'toast',
      'easel',
      'saucy',
      'value',
      'spice',
      'honor',
      'route',
      'sharp',
      'bawdy',
      'radii',
      'skull',
      'phony',
      'issue',
      'lager',
      'swell',
      'urine',
      'gassy',
      'trial',
      'flora',
      'upper',
      'latch',
      'wight',
      'brick',
      'retry',
      'holly',
      'decal',
      'grass',
      'shack',
      'dogma',
      'mover',
      'defer',
      'sober',
      'optic',
      'crier',
      'vying',
      'nomad',
      'flute',
      'hippo',
      'shark',
      'drier',
      'obese',
      'bugle',
      'tawny',
      'chalk',
      'feast',
      'ruddy',
      'pedal',
      'scarf',
      'cruel',
      'bleat',
      'tidal',
      'slush',
      'semen',
      'windy',
      'dusty',
      'sally',
      'igloo',
      'nerdy',
      'jewel',
      'shone',
      'whale',
      'hymen',
      'abuse',
      'fugue',
      'elbow',
      'crumb',
      'pansy',
      'welsh',
      'syrup',
      'terse',
      'suave',
      'gamut',
      'swung',
      'drake',
      'freed',
      'afire',
      'shirt',
      'grout',
      'oddly',
      'tithe',
      'plaid',
      'dummy',
      'broom',
      'blind',
      'torch',
      'enemy',
      'again',
      'tying',
      'pesky',
      'alter',
      'gazer',
      'noble',
      'ethos',
      'bride',
      'extol',
      'decor',
      'hobby',
      'beast',
      'idiom',
      'utter',
      'these',
      'sixth',
      'alarm',
      'erase',
      'elegy',
      'spunk',
      'piper',
      'scaly',
      'scold',
      'hefty',
      'chick',
      'sooty',
      'canal',
      'whiny',
      'slash',
      'quake',
      'joint',
      'swept',
      'prude',
      'heavy',
      'wield',
      'femme',
      'lasso',
      'maize',
      'shale',
      'screw',
      'spree',
      'smoky',
      'whiff',
      'scent',
      'glade',
      'spent',
      'prism',
      'stoke',
      'riper',
      'orbit',
      'cocoa',
      'guilt',
      'humus',
      'shush',
      'table',
      'smirk',
      'wrong',
      'noisy',
      'alert',
      'shiny',
      'elate',
      'resin',
      'whole',
      'hunch',
      'pixel',
      'polar',
      'hotel',
      'sword',
      'cleat',
      'mango',
      'rumba',
      'puffy',
      'filly',
      'billy',
      'leash',
      'clout',
      'dance',
      'ovate',
      'facet',
      'chili',
      'paint',
      'liner',
      'curio',
      'salty',
      'audio',
      'snake',
      'fable',
      'cloak',
      'navel',
      'spurt',
      'pesto',
      'balmy',
      'flash',
      'unwed',
      'early',
      'churn',
      'weedy',
      'stump',
      'lease',
      'witty',
      'wimpy',
      'spoof',
      'saner',
      'blend',
      'salsa',
      'thick',
      'warty',
      'manic',
      'blare',
      'squib',
      'spoon',
      'probe',
      'crepe',
      'knack',
      'force',
      'debut',
      'order',
      'haste',
      'teeth',
      'agent',
      'widen',
      'icily',
      'slice',
      'ingot',
      'clash',
      'juror',
      'blood',
      'abode',
      'throw',
      'unity',
      'pivot',
      'slept',
      'troop',
      'spare',
      'sewer',
      'parse',
      'morph',
      'cacti',
      'tacky',
      'spool',
      'demon',
      'moody',
      'annex',
      'begin',
      'fuzzy',
      'patch',
      'water',
      'lumpy',
      'admin',
      'omega',
      'limit',
      'tabby',
      'macho',
      'aisle',
      'skiff',
      'basis',
      'plank',
      'verge',
      'botch',
      'crawl',
      'lousy',
      'slain',
      'cubic',
      'raise',
      'wrack',
      'guide',
      'foist',
      'cameo',
      'under',
      'actor',
      'revue',
      'fraud',
      'harpy',
      'scoop',
      'climb',
      'refer',
      'olden',
      'clerk',
      'debar',
      'tally',
      'ethic',
      'cairn',
      'tulle',
      'ghoul',
      'hilly',
      'crude',
      'apart',
      'scale',
      'older',
      'plain',
      'sperm',
      'briny',
      'abbot',
      'rerun',
      'quest',
      'crisp',
      'bound',
      'befit',
      'drawn',
      'suite',
      'itchy',
      'cheer',
      'bagel',
      'guess',
      'broad',
      'axiom',
      'chard',
      'caput',
      'leant',
      'harsh',
      'curse',
      'proud',
      'swing',
      'opine',
      'taste',
      'lupus',
      'gumbo',
      'miner',
      'green',
      'chasm',
      'lipid',
      'topic',
      'armor',
      'brush',
      'crane',
      'mural',
      'abled',
      'habit',
      'bossy',
      'maker',
      'dusky',
      'dizzy',
      'lithe',
      'brook',
      'jazzy',
      'fifty',
      'sense',
      'giant',
      'surly',
      'legal',
      'fatal',
      'flunk',
      'began',
      'prune',
      'small',
      'slant',
      'scoff',
      'torus',
      'ninny',
      'covey',
      'viper',
      'taken',
      'moral',
      'vogue',
      'owing',
      'token',
      'entry',
      'booth',
      'voter',
      'chide',
      'elfin',
      'ebony',
      'neigh',
      'minim',
      'melon',
      'kneed',
      'decoy',
      'voila',
      'ankle',
      'arrow',
      'mushy',
      'tribe',
      'cease',
      'eager',
      'birth',
      'graph',
      'odder',
      'terra',
      'weird',
      'tried',
      'clack',
      'color',
      'rough',
      'weigh',
      'uncut',
      'ladle',
      'strip',
      'craft',
      'minus',
      'dicey',
      'titan',
      'lucid',
      'vicar',
      'dress',
      'ditch',
      'gypsy',
      'pasta',
      'taffy',
      'flame',
      'swoop',
      'aloof',
      'sight',
      'broke',
      'teary',
      'chart',
      'sixty',
      'wordy',
      'sheer',
      'leper',
      'nosey',
      'bulge',
      'savor',
      'clamp',
      'funky',
      'foamy',
      'toxic',
      'brand',
      'plumb',
      'dingy',
      'butte',
      'drill',
      'tripe',
      'bicep',
      'tenor',
      'krill',
      'worse',
      'drama',
      'hyena',
      'think',
      'ratio',
      'cobra',
      'basil',
      'scrum',
      'bused',
      'phone',
      'court',
      'camel',
      'proof',
      'heard',
      'angel',
      'petal',
      'pouty',
      'throb',
      'maybe',
      'fetal',
      'sprig',
      'spine',
      'shout',
      'cadet',
      'macro',
      'dodgy',
      'satyr',
      'rarer',
      'binge',
      'trend',
      'nutty',
      'leapt',
      'amiss',
      'split',
      'myrrh',
      'width',
      'sonar',
      'tower',
      'baron',
      'fever',
      'waver',
      'spark',
      'belie',
      'sloop',
      'expel',
      'smote',
      'baler',
      'above',
      'north',
      'wafer',
      'scant',
      'frill',
      'awash',
      'snack',
      'scowl',
      'frail',
      'drift',
      'limbo',
      'fence',
      'motel',
      'ounce',
      'wreak',
      'revel',
      'talon',
      'prior',
      'knelt',
      'cello',
      'flake',
      'debug',
      'anode',
      'crime',
      'salve',
      'scout',
      'imbue',
      'pinky',
      'stave',
      'vague',
      'chock',
      'fight',
      'video',
      'stone',
      'teach',
      'cleft',
      'frost',
      'prawn',
      'booty',
      'twist',
      'apnea',
      'stiff',
      'plaza',
      'ledge',
      'tweak',
      'board',
      'grant',
      'medic',
      'bacon',
      'cable',
      'brawl',
      'slunk',
      'raspy',
      'forum',
      'drone',
      'women',
      'mucus',
      'boast',
      'toddy',
      'coven',
      'tumor',
      'truer',
      'wrath',
      'stall',
      'steam',
      'axial',
      'purer',
      'daily',
      'trail',
      'niche',
      'mealy',
      'juice',
      'nylon',
      'plump',
      'merry',
      'flail',
      'papal',
      'wheat',
      'berry',
      'cower',
      'erect',
      'brute',
      'leggy',
      'snipe',
      'sinew',
      'skier',
      'penny',
      'jumpy',
      'rally',
      'umbra',
      'scary',
      'modem',
      'gross',
      'avian',
      'greed',
      'satin',
      'tonic',
      'parka',
      'sniff',
      'livid',
      'stark',
      'trump',
      'giddy',
      'reuse',
      'taboo',
      'avoid',
      'quote',
      'devil',
      'liken',
      'gloss',
      'gayer',
      'beret',
      'noise',
      'gland',
      'dealt',
      'sling',
      'rumor',
      'opera',
      'thigh',
      'tonga',
      'flare',
      'wound',
      'white',
      'bulky',
      'etude',
      'horse',
      'circa',
      'paddy',
      'inbox',
      'fizzy',
      'grain',
      'exert',
      'surge',
      'gleam',
      'belle',
      'salvo',
      'crush',
      'fruit',
      'sappy',
      'taker',
      'tract',
      'ovine',
      'spiky',
      'frank',
      'reedy',
      'filth',
      'spasm',
      'heave',
      'mambo',
      'right',
      'clank',
      'trust',
      'lumen',
      'borne',
      'spook',
      'sauce',
      'amber',
      'lathe',
      'carat',
      'corer',
      'dirty',
      'slyly',
      'affix',
      'alloy',
      'taint',
      'sheep',
      'kinky',
      'wooly',
      'mauve',
      'flung',
      'yacht',
      'fried',
      'quail',
      'brunt',
      'grimy',
      'curvy',
      'cagey',
      'rinse',
      'deuce',
      'state',
      'grasp',
      'milky',
      'bison',
      'graft',
      'sandy',
      'baste',
      'flask',
      'hedge',
      'girly',
      'swash',
      'boney',
      'coupe',
      'endow',
      'abhor',
      'welch',
      'blade',
      'tight',
      'geese',
      'miser',
      'mirth',
      'cloud',
      'cabal',
      'leech',
      'close',
      'tenth',
      'pecan',
      'droit',
      'grail',
      'clone',
      'guise',
      'ralph',
      'tango',
      'biddy',
      'smith',
      'mower',
      'payee',
      'serif',
      'drape',
      'fifth',
      'spank',
      'glaze',
      'allot',
      'truck',
      'kayak',
      'virus',
      'testy',
      'tepee',
      'fully',
      'zonal',
      'metro',
      'curry',
      'grand',
      'banjo',
      'axion',
      'bezel',
      'occur',
      'chain',
      'nasal',
      'gooey',
      'filer',
      'brace',
      'allay',
      'pubic',
      'raven',
      'plead',
      'gnash',
      'flaky',
      'munch',
      'dully',
      'eking',
      'thing',
      'slink',
      'hurry',
      'theft',
      'shorn',
      'pygmy',
      'ranch',
      'wring',
      'lemon',
      'shore',
      'mamma',
      'froze',
      'newer',
      'style',
      'moose',
      'antic',
      'drown',
      'vegan',
      'chess',
      'guppy',
      'union',
      'lever',
      'lorry',
      'image',
      'cabby',
      'druid',
      'exact',
      'truth',
      'dopey',
      'spear',
      'cried',
      'chime',
      'crony',
      'stunk',
      'timid',
      'batch',
      'gauge',
      'rotor',
      'crack',
      'curve',
      'latte',
      'witch',
      'bunch',
      'repel',
      'anvil',
      'soapy',
      'meter',
      'broth',
      'madly',
      'dried',
      'scene',
      'known',
      'magma',
      'roost',
      'woman',
      'thong',
      'punch',
      'pasty',
      'downy',
      'knead',
      'whirl',
      'rapid',
      'clang',
      'anger',
      'drive',
      'goofy',
      'email',
      'music',
      'stuff',
      'bleep',
      'rider',
      'mecca',
      'folio',
      'setup',
      'verso',
      'quash',
      'fauna',
      'gummy',
      'happy',
      'newly',
      'fussy',
      'relic',
      'guava',
      'ratty',
      'fudge',
      'femur',
      'chirp',
      'forte',
      'alibi',
      'whine',
      'petty',
      'golly',
      'plait',
      'fleck',
      'felon',
      'gourd',
      'brown',
      'thrum',
      'ficus',
      'stash',
      'decry',
      'wiser',
      'junta',
      'visor',
      'daunt',
      'scree',
      'impel',
      'await',
      'press',
      'whose',
      'turbo',
      'stoop',
      'speak',
      'mangy',
      'eying',
      'inlet',
      'crone',
      'pulse',
      'mossy',
      'staid',
      'hence',
      'pinch',
      'teddy',
      'sully',
      'snore',
      'ripen',
      'snowy',
      'attic',
      'going',
      'leach',
      'mouth',
      'hound',
      'clump',
      'tonal',
      'bigot',
      'peril',
      'piece',
      'blame',
      'haute',
      'spied',
      'undid',
      'intro',
      'basal',
      'shine',
      'gecko',
      'rodeo',
      'guard',
      'steer',
      'loamy',
      'scamp',
      'scram',
      'manly',
      'hello',
      'vaunt',
      'organ',
      'feral',
      'knock',
      'extra',
      'condo',
      'adapt',
      'willy',
      'polka',
      'rayon',
      'skirt',
      'faith',
      'torso',
      'match',
      'mercy',
      'tepid',
      'sleek',
      'riser',
      'twixt',
      'peace',
      'flush',
      'catty',
      'login',
      'eject',
      'roger',
      'rival',
      'untie',
      'refit',
      'aorta',
      'adult',
      'judge',
      'rower',
      'artsy',
      'rural',
      'shave',
      'aahed',
      'aalii',
      'aargh',
      'aarti',
      'abaca',
      'abaci',
      'abacs',
      'abaft',
      'abaka',
      'abamp',
      'aband',
      'abash',
      'abask',
      'abaya',
      'abbas',
      'abbed',
      'abbes',
      'abcee',
      'abeam',
      'abear',
      'abele',
      'abers',
      'abets',
      'abies',
      'abler',
      'ables',
      'ablet',
      'ablow',
      'abmho',
      'abohm',
      'aboil',
      'aboma',
      'aboon',
      'abord',
      'abore',
      'abram',
      'abray',
      'abrim',
      'abrin',
      'abris',
      'absey',
      'absit',
      'abuna',
      'abune',
      'abuts',
      'abuzz',
      'abyes',
      'abysm',
      'acais',
      'acari',
      'accas',
      'accoy',
      'acerb',
      'acers',
      'aceta',
      'achar',
      'ached',
      'aches',
      'achoo',
      'acids',
      'acidy',
      'acing',
      'acini',
      'ackee',
      'acker',
      'acmes',
      'acmic',
      'acned',
      'acnes',
      'acock',
      'acold',
      'acred',
      'acres',
      'acros',
      'acted',
      'actin',
      'acton',
      'acyls',
      'adaws',
      'adays',
      'adbot',
      'addax',
      'added',
      'adder',
      'addio',
      'addle',
      'adeem',
      'adhan',
      'adieu',
      'adios',
      'adits',
      'adman',
      'admen',
      'admix',
      'adobo',
      'adown',
      'adoze',
      'adrad',
      'adred',
      'adsum',
      'aduki',
      'adunc',
      'adust',
      'advew',
      'adyta',
      'adzed',
      'adzes',
      'aecia',
      'aedes',
      'aegis',
      'aeons',
      'aerie',
      'aeros',
      'aesir',
      'afald',
      'afara',
      'afars',
      'afear',
      'aflaj',
      'afore',
      'afrit',
      'afros',
      'agama',
      'agami',
      'agars',
      'agast',
      'agave',
      'agaze',
      'agene',
      'agers',
      'agger',
      'aggie',
      'aggri',
      'aggro',
      'aggry',
      'aghas',
      'agila',
      'agios',
      'agism',
      'agist',
      'agita',
      'aglee',
      'aglet',
      'agley',
      'agloo',
      'aglus',
      'agmas',
      'agoge',
      'agone',
      'agons',
      'agood',
      'agria',
      'agrin',
      'agros',
      'agued',
      'agues',
      'aguna',
      'aguti',
      'aheap',
      'ahent',
      'ahigh',
      'ahind',
      'ahing',
      'ahint',
      'ahold',
      'ahull',
      'ahuru',
      'aidas',
      'aided',
      'aides',
      'aidoi',
      'aidos',
      'aiery',
      'aigas',
      'aight',
      'ailed',
      'aimed',
      'aimer',
      'ainee',
      'ainga',
      'aioli',
      'aired',
      'airer',
      'airns',
      'airth',
      'airts',
      'aitch',
      'aitus',
      'aiver',
      'aiyee',
      'aizle',
      'ajies',
      'ajiva',
      'ajuga',
      'ajwan',
      'akees',
      'akela',
      'akene',
      'aking',
      'akita',
      'akkas',
      'alaap',
      'alack',
      'alamo',
      'aland',
      'alane',
      'alang',
      'alans',
      'alant',
      'alapa',
      'alaps',
      'alary',
      'alate',
      'alays',
      'albas',
      'albee',
      'alcid',
      'alcos',
      'aldea',
      'alder',
      'aldol',
      'aleck',
      'alecs',
      'alefs',
      'aleft',
      'aleph',
      'alews',
      'aleye',
      'alfas',
      'algal',
      'algas',
      'algid',
      'algin',
      'algor',
      'algum',
      'alias',
      'alifs',
      'aline',
      'alist',
      'aliya',
      'alkie',
      'alkos',
      'alkyd',
      'alkyl',
      'allee',
      'allel',
      'allis',
      'allod',
      'allyl',
      'almah',
      'almas',
      'almeh',
      'almes',
      'almud',
      'almug',
      'alods',
      'aloed',
      'aloes',
      'aloha',
      'aloin',
      'aloos',
      'alowe',
      'altho',
      'altos',
      'alula',
      'alums',
      'alure',
      'alvar',
      'alway',
      'amahs',
      'amain',
      'amate',
      'amaut',
      'amban',
      'ambit',
      'ambos',
      'ambry',
      'ameba',
      'ameer',
      'amene',
      'amens',
      'ament',
      'amias',
      'amice',
      'amici',
      'amide',
      'amido',
      'amids',
      'amies',
      'amiga',
      'amigo',
      'amine',
      'amino',
      'amins',
      'amirs',
      'amlas',
      'amman',
      'ammon',
      'ammos',
      'amnia',
      'amnic',
      'amnio',
      'amoks',
      'amole',
      'amort',
      'amour',
      'amove',
      'amowt',
      'amped',
      'ampul',
      'amrit',
      'amuck',
      'amyls',
      'anana',
      'anata',
      'ancho',
      'ancle',
      'ancon',
      'andro',
      'anear',
      'anele',
      'anent',
      'angas',
      'anglo',
      'anigh',
      'anile',
      'anils',
      'anima',
      'animi',
      'anion',
      'anise',
      'anker',
      'ankhs',
      'ankus',
      'anlas',
      'annal',
      'annas',
      'annat',
      'anoas',
      'anole',
      'anomy',
      'ansae',
      'antae',
      'antar',
      'antas',
      'anted',
      'antes',
      'antis',
      'antra',
      'antre',
      'antsy',
      'anura',
      'anyon',
      'apace',
      'apage',
      'apaid',
      'apayd',
      'apays',
      'apeak',
      'apeek',
      'apers',
      'apert',
      'apery',
      'apgar',
      'aphis',
      'apian',
      'apiol',
      'apish',
      'apism',
      'apode',
      'apods',
      'apoop',
      'aport',
      'appal',
      'appay',
      'appel',
      'appro',
      'appui',
      'appuy',
      'apres',
      'apses',
      'apsis',
      'apsos',
      'apted',
      'apter',
      'aquae',
      'aquas',
      'araba',
      'araks',
      'arame',
      'arars',
      'arbas',
      'arced',
      'archi',
      'arcos',
      'arcus',
      'ardeb',
      'ardri',
      'aread',
      'areae',
      'areal',
      'arear',
      'areas',
      'areca',
      'aredd',
      'arede',
      'arefy',
      'areic',
      'arene',
      'arepa',
      'arere',
      'arete',
      'arets',
      'arett',
      'argal',
      'argan',
      'argil',
      'argle',
      'argol',
      'argon',
      'argot',
      'argus',
      'arhat',
      'arias',
      'ariel',
      'ariki',
      'arils',
      'ariot',
      'arish',
      'arked',
      'arled',
      'arles',
      'armed',
      'armer',
      'armet',
      'armil',
      'arnas',
      'arnut',
      'aroba',
      'aroha',
      'aroid',
      'arpas',
      'arpen',
      'arrah',
      'arras',
      'arret',
      'arris',
      'arroz',
      'arsed',
      'arses',
      'arsey',
      'arsis',
      'artal',
      'artel',
      'artic',
      'artis',
      'aruhe',
      'arums',
      'arval',
      'arvee',
      'arvos',
      'aryls',
      'asana',
      'ascon',
      'ascus',
      'asdic',
      'ashed',
      'ashes',
      'ashet',
      'asked',
      'asker',
      'askoi',
      'askos',
      'aspen',
      'asper',
      'aspic',
      'aspie',
      'aspis',
      'aspro',
      'assai',
      'assam',
      'asses',
      'assez',
      'assot',
      'aster',
      'astir',
      'astun',
      'asura',
      'asway',
      'aswim',
      'asyla',
      'ataps',
      'ataxy',
      'atigi',
      'atilt',
      'atimy',
      'atlas',
      'atman',
      'atmas',
      'atmos',
      'atocs',
      'atoke',
      'atoks',
      'atoms',
      'atomy',
      'atony',
      'atopy',
      'atria',
      'atrip',
      'attap',
      'attar',
      'atuas',
      'audad',
      'auger',
      'aught',
      'aulas',
      'aulic',
      'auloi',
      'aulos',
      'aumil',
      'aunes',
      'aunts',
      'aurae',
      'aural',
      'aurar',
      'auras',
      'aurei',
      'aures',
      'auric',
      'auris',
      'aurum',
      'autos',
      'auxin',
      'avale',
      'avant',
      'avast',
      'avels',
      'avens',
      'avers',
      'avgas',
      'avine',
      'avion',
      'avise',
      'aviso',
      'avize',
      'avows',
      'avyze',
      'awarn',
      'awato',
      'awave',
      'aways',
      'awdls',
      'aweel',
      'aweto',
      'awing',
      'awmry',
      'awned',
      'awner',
      'awols',
      'awork',
      'axels',
      'axile',
      'axils',
      'axing',
      'axite',
      'axled',
      'axles',
      'axman',
      'axmen',
      'axoid',
      'axone',
      'axons',
      'ayahs',
      'ayaya',
      'ayelp',
      'aygre',
      'ayins',
      'ayont',
      'ayres',
      'ayrie',
      'azans',
      'azide',
      'azido',
      'azine',
      'azlon',
      'azoic',
      'azole',
      'azons',
      'azote',
      'azoth',
      'azuki',
      'azurn',
      'azury',
      'azygy',
      'azyme',
      'azyms',
      'baaed',
      'baals',
      'babas',
      'babel',
      'babes',
      'babka',
      'baboo',
      'babul',
      'babus',
      'bacca',
      'bacco',
      'baccy',
      'bacha',
      'bachs',
      'backs',
      'baddy',
      'baels',
      'baffs',
      'baffy',
      'bafts',
      'baghs',
      'bagie',
      'bahts',
      'bahus',
      'bahut',
      'bails',
      'bairn',
      'baisa',
      'baith',
      'baits',
      'baiza',
      'baize',
      'bajan',
      'bajra',
      'bajri',
      'bajus',
      'baked',
      'baken',
      'bakes',
      'bakra',
      'balas',
      'balds',
      'baldy',
      'baled',
      'bales',
      'balks',
      'balky',
      'balls',
      'bally',
      'balms',
      'baloo',
      'balsa',
      'balti',
      'balun',
      'balus',
      'bambi',
      'banak',
      'banco',
      'bancs',
      'banda',
      'bandh',
      'bands',
      'bandy',
      'baned',
      'banes',
      'bangs',
      'bania',
      'banks',
      'banns',
      'bants',
      'bantu',
      'banty',
      'banya',
      'bapus',
      'barbe',
      'barbs',
      'barby',
      'barca',
      'barde',
      'bardo',
      'bards',
      'bardy',
      'bared',
      'barer',
      'bares',
      'barfi',
      'barfs',
      'baric',
      'barks',
      'barky',
      'barms',
      'barmy',
      'barns',
      'barny',
      'barps',
      'barra',
      'barre',
      'barro',
      'barry',
      'barye',
      'basan',
      'based',
      'basen',
      'baser',
      'bases',
      'basho',
      'basij',
      'basks',
      'bason',
      'basse',
      'bassi',
      'basso',
      'bassy',
      'basta',
      'basti',
      'basto',
      'basts',
      'bated',
      'bates',
      'baths',
      'batik',
      'batta',
      'batts',
      'battu',
      'bauds',
      'bauks',
      'baulk',
      'baurs',
      'bavin',
      'bawds',
      'bawks',
      'bawls',
      'bawns',
      'bawrs',
      'bawty',
      'bayed',
      'bayer',
      'bayes',
      'bayle',
      'bayts',
      'bazar',
      'bazoo',
      'beads',
      'beaks',
      'beaky',
      'beals',
      'beams',
      'beamy',
      'beano',
      'beans',
      'beany',
      'beare',
      'bears',
      'beath',
      'beats',
      'beaty',
      'beaus',
      'beaut',
      'beaux',
      'bebop',
      'becap',
      'becke',
      'becks',
      'bedad',
      'bedel',
      'bedes',
      'bedew',
      'bedim',
      'bedye',
      'beedi',
      'beefs',
      'beeps',
      'beers',
      'beery',
      'beets',
      'befog',
      'begad',
      'begar',
      'begem',
      'begot',
      'begum',
      'beige',
      'beigy',
      'beins',
      'bekah',
      'belah',
      'belar',
      'belay',
      'belee',
      'belga',
      'bells',
      'belon',
      'belts',
      'bemad',
      'bemas',
      'bemix',
      'bemud',
      'bends',
      'bendy',
      'benes',
      'benet',
      'benga',
      'benis',
      'benne',
      'benni',
      'benny',
      'bento',
      'bents',
      'benty',
      'bepat',
      'beray',
      'beres',
      'bergs',
      'berko',
      'berks',
      'berme',
      'berms',
      'berob',
      'beryl',
      'besat',
      'besaw',
      'besee',
      'beses',
      'besit',
      'besom',
      'besot',
      'besti',
      'bests',
      'betas',
      'beted',
      'betes',
      'beths',
      'betid',
      'beton',
      'betta',
      'betty',
      'bever',
      'bevor',
      'bevue',
      'bevvy',
      'bewet',
      'bewig',
      'bezes',
      'bezil',
      'bezzy',
      'bhais',
      'bhaji',
      'bhang',
      'bhats',
      'bhels',
      'bhoot',
      'bhuna',
      'bhuts',
      'biach',
      'biali',
      'bialy',
      'bibbs',
      'bibes',
      'biccy',
      'bices',
      'bided',
      'bider',
      'bides',
      'bidet',
      'bidis',
      'bidon',
      'bield',
      'biers',
      'biffo',
      'biffs',
      'biffy',
      'bifid',
      'bigae',
      'biggs',
      'biggy',
      'bigha',
      'bight',
      'bigly',
      'bigos',
      'bijou',
      'biked',
      'biker',
      'bikes',
      'bikie',
      'bilbo',
      'bilby',
      'biled',
      'biles',
      'bilgy',
      'bilks',
      'bills',
      'bimah',
      'bimas',
      'bimbo',
      'binal',
      'bindi',
      'binds',
      'biner',
      'bines',
      'bings',
      'bingy',
      'binit',
      'binks',
      'bints',
      'biogs',
      'biont',
      'biota',
      'biped',
      'bipod',
      'birds',
      'birks',
      'birle',
      'birls',
      'biros',
      'birrs',
      'birse',
      'birsy',
      'bises',
      'bisks',
      'bisom',
      'bitch',
      'biter',
      'bites',
      'bitos',
      'bitou',
      'bitsy',
      'bitte',
      'bitts',
      'bivia',
      'bivvy',
      'bizes',
      'bizzo',
      'bizzy',
      'blabs',
      'blads',
      'blady',
      'blaer',
      'blaes',
      'blaff',
      'blags',
      'blahs',
      'blain',
      'blams',
      'blart',
      'blase',
      'blash',
      'blate',
      'blats',
      'blatt',
      'blaud',
      'blawn',
      'blaws',
      'blays',
      'blear',
      'blebs',
      'blech',
      'blees',
      'blent',
      'blert',
      'blest',
      'blets',
      'bleys',
      'blimy',
      'bling',
      'blini',
      'blins',
      'bliny',
      'blips',
      'blist',
      'blite',
      'blits',
      'blive',
      'blobs',
      'blocs',
      'blogs',
      'blook',
      'bloop',
      'blore',
      'blots',
      'blows',
      'blowy',
      'blubs',
      'blude',
      'bluds',
      'bludy',
      'blued',
      'blues',
      'bluet',
      'bluey',
      'bluid',
      'blume',
      'blunk',
      'blurs',
      'blype',
      'boabs',
      'boaks',
      'boars',
      'boart',
      'boats',
      'bobac',
      'bobak',
      'bobas',
      'bobol',
      'bobos',
      'bocca',
      'bocce',
      'bocci',
      'boche',
      'bocks',
      'boded',
      'bodes',
      'bodge',
      'bodhi',
      'bodle',
      'boeps',
      'boets',
      'boeuf',
      'boffo',
      'boffs',
      'bogan',
      'bogey',
      'boggy',
      'bogie',
      'bogle',
      'bogue',
      'bogus',
      'bohea',
      'bohos',
      'boils',
      'boing',
      'boink',
      'boite',
      'boked',
      'bokeh',
      'bokes',
      'bokos',
      'bolar',
      'bolas',
      'bolds',
      'boles',
      'bolix',
      'bolls',
      'bolos',
      'bolts',
      'bolus',
      'bomas',
      'bombe',
      'bombo',
      'bombs',
      'bonce',
      'bonds',
      'boned',
      'boner',
      'bones',
      'bongs',
      'bonie',
      'bonks',
      'bonne',
      'bonny',
      'bonza',
      'bonze',
      'booai',
      'booay',
      'boobs',
      'boody',
      'booed',
      'boofy',
      'boogy',
      'boohs',
      'books',
      'booky',
      'bools',
      'booms',
      'boomy',
      'boong',
      'boons',
      'boord',
      'boors',
      'boose',
      'boots',
      'boppy',
      'borak',
      'boral',
      'boras',
      'borde',
      'bords',
      'bored',
      'boree',
      'borel',
      'borer',
      'bores',
      'borgo',
      'boric',
      'borks',
      'borms',
      'borna',
      'boron',
      'borts',
      'borty',
      'bortz',
      'bosie',
      'bosks',
      'bosky',
      'boson',
      'bosun',
      'botas',
      'botel',
      'botes',
      'bothy',
      'botte',
      'botts',
      'botty',
      'bouge',
      'bouks',
      'boult',
      'bouns',
      'bourd',
      'bourg',
      'bourn',
      'bouse',
      'bousy',
      'bouts',
      'bovid',
      'bowat',
      'bowed',
      'bower',
      'bowes',
      'bowet',
      'bowie',
      'bowls',
      'bowne',
      'bowrs',
      'bowse',
      'boxed',
      'boxen',
      'boxes',
      'boxla',
      'boxty',
      'boyar',
      'boyau',
      'boyed',
      'boyfs',
      'boygs',
      'boyla',
      'boyos',
      'boysy',
      'bozos',
      'braai',
      'brach',
      'brack',
      'bract',
      'brads',
      'braes',
      'brags',
      'brail',
      'braks',
      'braky',
      'brame',
      'brane',
      'brank',
      'brans',
      'brant',
      'brast',
      'brats',
      'brava',
      'bravi',
      'braws',
      'braxy',
      'brays',
      'braza',
      'braze',
      'bream',
      'brede',
      'breds',
      'breem',
      'breer',
      'brees',
      'breid',
      'breis',
      'breme',
      'brens',
      'brent',
      'brere',
      'brers',
      'breve',
      'brews',
      'breys',
      'brier',
      'bries',
      'brigs',
      'briki',
      'briks',
      'brill',
      'brims',
      'brins',
      'brios',
      'brise',
      'briss',
      'brith',
      'brits',
      'britt',
      'brize',
      'broch',
      'brock',
      'brods',
      'brogh',
      'brogs',
      'brome',
      'bromo',
      'bronc',
      'brond',
      'brool',
      'broos',
      'brose',
      'brosy',
      'brows',
      'brugh',
      'bruin',
      'bruit',
      'brule',
      'brume',
      'brung',
      'brusk',
      'brust',
      'bruts',
      'buats',
      'buaze',
      'bubal',
      'bubas',
      'bubba',
      'bubbe',
      'bubby',
      'bubus',
      'buchu',
      'bucko',
      'bucks',
      'bucku',
      'budas',
      'budis',
      'budos',
      'buffa',
      'buffe',
      'buffi',
      'buffo',
      'buffs',
      'buffy',
      'bufos',
      'bufty',
      'buhls',
      'buhrs',
      'buiks',
      'buist',
      'bukes',
      'bulbs',
      'bulgy',
      'bulks',
      'bulla',
      'bulls',
      'bulse',
      'bumbo',
      'bumfs',
      'bumph',
      'bumps',
      'bumpy',
      'bunas',
      'bunce',
      'bunco',
      'bunde',
      'bundh',
      'bunds',
      'bundt',
      'bundu',
      'bundy',
      'bungs',
      'bungy',
      'bunia',
      'bunje',
      'bunjy',
      'bunko',
      'bunks',
      'bunns',
      'bunts',
      'bunty',
      'bunya',
      'buoys',
      'buppy',
      'buran',
      'buras',
      'burbs',
      'burds',
      'buret',
      'burfi',
      'burgh',
      'burgs',
      'burin',
      'burka',
      'burke',
      'burks',
      'burls',
      'burns',
      'buroo',
      'burps',
      'burqa',
      'burro',
      'burrs',
      'burry',
      'bursa',
      'burse',
      'busby',
      'buses',
      'busks',
      'busky',
      'bussu',
      'busti',
      'busts',
      'busty',
      'buteo',
      'butes',
      'butle',
      'butoh',
      'butts',
      'butty',
      'butut',
      'butyl',
      'buzzy',
      'bwana',
      'bwazi',
      'byded',
      'bydes',
      'byked',
      'bykes',
      'byres',
      'byrls',
      'byssi',
      'bytes',
      'byway',
      'caaed',
      'cabas',
      'caber',
      'cabob',
      'caboc',
      'cabre',
      'cacas',
      'cacks',
      'cacky',
      'cadee',
      'cades',
      'cadge',
      'cadgy',
      'cadie',
      'cadis',
      'cadre',
      'caeca',
      'caese',
      'cafes',
      'caffs',
      'caged',
      'cager',
      'cages',
      'cagot',
      'cahow',
      'caids',
      'cains',
      'caird',
      'cajon',
      'cajun',
      'caked',
      'cakes',
      'cakey',
      'calfs',
      'calid',
      'calif',
      'calix',
      'calks',
      'calla',
      'calls',
      'calms',
      'calmy',
      'calos',
      'calpa',
      'calps',
      'calve',
      'calyx',
      'caman',
      'camas',
      'cames',
      'camis',
      'camos',
      'campi',
      'campo',
      'camps',
      'campy',
      'camus',
      'caned',
      'caneh',
      'caner',
      'canes',
      'cangs',
      'canid',
      'canna',
      'canns',
      'canso',
      'canst',
      'canto',
      'cants',
      'canty',
      'capas',
      'caped',
      'capes',
      'capex',
      'caphs',
      'capiz',
      'caple',
      'capon',
      'capos',
      'capot',
      'capri',
      'capul',
      'carap',
      'carbo',
      'carbs',
      'carby',
      'cardi',
      'cards',
      'cardy',
      'cared',
      'carer',
      'cares',
      'caret',
      'carex',
      'carks',
      'carle',
      'carls',
      'carns',
      'carny',
      'carob',
      'carom',
      'caron',
      'carpi',
      'carps',
      'carrs',
      'carse',
      'carta',
      'carte',
      'carts',
      'carvy',
      'casas',
      'casco',
      'cased',
      'cases',
      'casks',
      'casky',
      'casts',
      'casus',
      'cates',
      'cauda',
      'cauks',
      'cauld',
      'cauls',
      'caums',
      'caups',
      'cauri',
      'causa',
      'cavas',
      'caved',
      'cavel',
      'caver',
      'caves',
      'cavie',
      'cawed',
      'cawks',
      'caxon',
      'ceaze',
      'cebid',
      'cecal',
      'cecum',
      'ceded',
      'ceder',
      'cedes',
      'cedis',
      'ceiba',
      'ceili',
      'ceils',
      'celeb',
      'cella',
      'celli',
      'cells',
      'celom',
      'celts',
      'cense',
      'cento',
      'cents',
      'centu',
      'ceorl',
      'cepes',
      'cerci',
      'cered',
      'ceres',
      'cerge',
      'ceria',
      'ceric',
      'cerne',
      'ceroc',
      'ceros',
      'certs',
      'certy',
      'cesse',
      'cesta',
      'cesti',
      'cetes',
      'cetyl',
      'cezve',
      'chace',
      'chack',
      'chaco',
      'chado',
      'chads',
      'chaft',
      'chais',
      'chals',
      'chams',
      'chana',
      'chang',
      'chank',
      'chape',
      'chaps',
      'chapt',
      'chara',
      'chare',
      'chark',
      'charr',
      'chars',
      'chary',
      'chats',
      'chave',
      'chavs',
      'chawk',
      'chaws',
      'chaya',
      'chays',
      'cheep',
      'chefs',
      'cheka',
      'chela',
      'chelp',
      'chemo',
      'chems',
      'chere',
      'chert',
      'cheth',
      'chevy',
      'chews',
      'chewy',
      'chiao',
      'chias',
      'chibs',
      'chica',
      'chich',
      'chico',
      'chics',
      'chiel',
      'chiks',
      'chile',
      'chimb',
      'chimo',
      'chimp',
      'chine',
      'ching',
      'chink',
      'chino',
      'chins',
      'chips',
      'chirk',
      'chirl',
      'chirm',
      'chiro',
      'chirr',
      'chirt',
      'chiru',
      'chits',
      'chive',
      'chivs',
      'chivy',
      'chizz',
      'choco',
      'chocs',
      'chode',
      'chogs',
      'choil',
      'choko',
      'choky',
      'chola',
      'choli',
      'cholo',
      'chomp',
      'chons',
      'choof',
      'chook',
      'choom',
      'choon',
      'chops',
      'chota',
      'chott',
      'chout',
      'choux',
      'chowk',
      'chows',
      'chubs',
      'chufa',
      'chuff',
      'chugs',
      'chums',
      'churl',
      'churr',
      'chuse',
      'chuts',
      'chyle',
      'chyme',
      'chynd',
      'cibol',
      'cided',
      'cides',
      'ciels',
      'ciggy',
      'cilia',
      'cills',
      'cimar',
      'cimex',
      'cinct',
      'cines',
      'cinqs',
      'cions',
      'cippi',
      'circs',
      'cires',
      'cirls',
      'cirri',
      'cisco',
      'cissy',
      'cists',
      'cital',
      'cited',
      'citer',
      'cites',
      'cives',
      'civet',
      'civie',
      'civvy',
      'clach',
      'clade',
      'clads',
      'claes',
      'clags',
      'clame',
      'clams',
      'clans',
      'claps',
      'clapt',
      'claro',
      'clart',
      'clary',
      'clast',
      'clats',
      'claut',
      'clave',
      'clavi',
      'claws',
      'clays',
      'cleck',
      'cleek',
      'cleep',
      'clefs',
      'clegs',
      'cleik',
      'clems',
      'clepe',
      'clept',
      'cleve',
      'clews',
      'clied',
      'clies',
      'clift',
      'clime',
      'cline',
      'clint',
      'clipe',
      'clips',
      'clipt',
      'clits',
      'cloam',
      'clods',
      'cloff',
      'clogs',
      'cloke',
      'clomb',
      'clomp',
      'clonk',
      'clons',
      'cloop',
      'cloot',
      'clops',
      'clote',
      'clots',
      'clour',
      'clous',
      'clows',
      'cloye',
      'cloys',
      'cloze',
      'clubs',
      'clues',
      'cluey',
      'clunk',
      'clype',
      'cnida',
      'coact',
      'coady',
      'coala',
      'coals',
      'coaly',
      'coapt',
      'coarb',
      'coate',
      'coati',
      'coats',
      'cobbs',
      'cobby',
      'cobia',
      'coble',
      'cobza',
      'cocas',
      'cocci',
      'cocco',
      'cocks',
      'cocky',
      'cocos',
      'codas',
      'codec',
      'coded',
      'coden',
      'coder',
      'codes',
      'codex',
      'codon',
      'coeds',
      'coffs',
      'cogie',
      'cogon',
      'cogue',
      'cohab',
      'cohen',
      'cohoe',
      'cohog',
      'cohos',
      'coifs',
      'coign',
      'coils',
      'coins',
      'coirs',
      'coits',
      'coked',
      'cokes',
      'colas',
      'colby',
      'colds',
      'coled',
      'coles',
      'coley',
      'colic',
      'colin',
      'colls',
      'colly',
      'colog',
      'colts',
      'colza',
      'comae',
      'comal',
      'comas',
      'combe',
      'combi',
      'combo',
      'combs',
      'comby',
      'comer',
      'comes',
      'comix',
      'commo',
      'comms',
      'commy',
      'compo',
      'comps',
      'compt',
      'comte',
      'comus',
      'coned',
      'cones',
      'coney',
      'confs',
      'conga',
      'conge',
      'congo',
      'conia',
      'conin',
      'conks',
      'conky',
      'conne',
      'conns',
      'conte',
      'conto',
      'conus',
      'convo',
      'cooch',
      'cooed',
      'cooee',
      'cooer',
      'cooey',
      'coofs',
      'cooks',
      'cooky',
      'cools',
      'cooly',
      'coomb',
      'cooms',
      'coomy',
      'coons',
      'coops',
      'coopt',
      'coost',
      'coots',
      'cooze',
      'copal',
      'copay',
      'coped',
      'copen',
      'coper',
      'copes',
      'coppy',
      'copra',
      'copsy',
      'coqui',
      'coram',
      'corbe',
      'corby',
      'cords',
      'cored',
      'cores',
      'corey',
      'corgi',
      'coria',
      'corks',
      'corky',
      'corms',
      'corni',
      'corno',
      'corns',
      'cornu',
      'corps',
      'corse',
      'corso',
      'cosec',
      'cosed',
      'coses',
      'coset',
      'cosey',
      'cosie',
      'costa',
      'coste',
      'costs',
      'cotan',
      'coted',
      'cotes',
      'coths',
      'cotta',
      'cotts',
      'coude',
      'coups',
      'courb',
      'courd',
      'coure',
      'cours',
      'couta',
      'couth',
      'coved',
      'coves',
      'covin',
      'cowal',
      'cowan',
      'cowed',
      'cowks',
      'cowls',
      'cowps',
      'cowry',
      'coxae',
      'coxal',
      'coxed',
      'coxes',
      'coxib',
      'coyau',
      'coyed',
      'coyer',
      'coypu',
      'cozed',
      'cozen',
      'cozes',
      'cozey',
      'cozie',
      'craal',
      'crabs',
      'crags',
      'craic',
      'craig',
      'crake',
      'crame',
      'crams',
      'crans',
      'crape',
      'craps',
      'crapy',
      'crare',
      'craws',
      'crays',
      'creds',
      'creel',
      'crees',
      'crems',
      'crena',
      'creps',
      'crepy',
      'crewe',
      'crews',
      'crias',
      'cribs',
      'cries',
      'crims',
      'crine',
      'crios',
      'cripe',
      'crips',
      'crise',
      'crith',
      'crits',
      'croci',
      'crocs',
      'croft',
      'crogs',
      'cromb',
      'crome',
      'cronk',
      'crons',
      'crool',
      'croon',
      'crops',
      'crore',
      'crost',
      'crout',
      'crows',
      'croze',
      'cruck',
      'crudo',
      'cruds',
      'crudy',
      'crues',
      'cruet',
      'cruft',
      'crunk',
      'cruor',
      'crura',
      'cruse',
      'crusy',
      'cruve',
      'crwth',
      'cryer',
      'ctene',
      'cubby',
      'cubeb',
      'cubed',
      'cuber',
      'cubes',
      'cubit',
      'cuddy',
      'cuffo',
      'cuffs',
      'cuifs',
      'cuing',
      'cuish',
      'cuits',
      'cukes',
      'culch',
      'culet',
      'culex',
      'culls',
      'cully',
      'culms',
      'culpa',
      'culti',
      'cults',
      'culty',
      'cumec',
      'cundy',
      'cunei',
      'cunit',
      'cunts',
      'cupel',
      'cupid',
      'cuppa',
      'cuppy',
      'curat',
      'curbs',
      'curch',
      'curds',
      'curdy',
      'cured',
      'curer',
      'cures',
      'curet',
      'curfs',
      'curia',
      'curie',
      'curli',
      'curls',
      'curns',
      'curny',
      'currs',
      'cursi',
      'curst',
      'cusec',
      'cushy',
      'cusks',
      'cusps',
      'cuspy',
      'cusso',
      'cusum',
      'cutch',
      'cuter',
      'cutes',
      'cutey',
      'cutin',
      'cutis',
      'cutto',
      'cutty',
      'cutup',
      'cuvee',
      'cuzes',
      'cwtch',
      'cyano',
      'cyans',
      'cycad',
      'cycas',
      'cyclo',
      'cyder',
      'cylix',
      'cymae',
      'cymar',
      'cymas',
      'cymes',
      'cymol',
      'cysts',
      'cytes',
      'cyton',
      'czars',
      'daals',
      'dabba',
      'daces',
      'dacha',
      'dacks',
      'dadah',
      'dadas',
      'dados',
      'daffs',
      'daffy',
      'dagga',
      'daggy',
      'dagos',
      'dahls',
      'daiko',
      'daine',
      'daint',
      'daker',
      'daled',
      'dales',
      'dalis',
      'dalle',
      'dalts',
      'daman',
      'damar',
      'dames',
      'damme',
      'damns',
      'damps',
      'dampy',
      'dancy',
      'dangs',
      'danio',
      'danks',
      'danny',
      'dants',
      'daraf',
      'darbs',
      'darcy',
      'dared',
      'darer',
      'dares',
      'darga',
      'dargs',
      'daric',
      'daris',
      'darks',
      'darky',
      'darns',
      'darre',
      'darts',
      'darzi',
      'dashi',
      'dashy',
      'datal',
      'dated',
      'dater',
      'dates',
      'datos',
      'datto',
      'daube',
      'daubs',
      'dauby',
      'dauds',
      'dault',
      'daurs',
      'dauts',
      'daven',
      'davit',
      'dawah',
      'dawds',
      'dawed',
      'dawen',
      'dawks',
      'dawns',
      'dawts',
      'dayan',
      'daych',
      'daynt',
      'dazed',
      'dazer',
      'dazes',
      'deads',
      'deair',
      'deals',
      'deans',
      'deare',
      'dearn',
      'dears',
      'deary',
      'deash',
      'deave',
      'deaws',
      'deawy',
      'debag',
      'debby',
      'debel',
      'debes',
      'debts',
      'debud',
      'debur',
      'debus',
      'debye',
      'decad',
      'decaf',
      'decan',
      'decko',
      'decks',
      'decos',
      'dedal',
      'deeds',
      'deedy',
      'deely',
      'deems',
      'deens',
      'deeps',
      'deere',
      'deers',
      'deets',
      'deeve',
      'deevs',
      'defat',
      'deffo',
      'defis',
      'defog',
      'degas',
      'degum',
      'degus',
      'deice',
      'deids',
      'deify',
      'deils',
      'deism',
      'deist',
      'deked',
      'dekes',
      'dekko',
      'deled',
      'deles',
      'delfs',
      'delft',
      'delis',
      'dells',
      'delly',
      'delos',
      'delph',
      'delts',
      'deman',
      'demes',
      'demic',
      'demit',
      'demob',
      'demoi',
      'demos',
      'dempt',
      'denar',
      'denay',
      'dench',
      'denes',
      'denet',
      'denis',
      'dents',
      'deoxy',
      'derat',
      'deray',
      'dered',
      'deres',
      'derig',
      'derma',
      'derms',
      'derns',
      'derny',
      'deros',
      'derro',
      'derry',
      'derth',
      'dervs',
      'desex',
      'deshi',
      'desis',
      'desks',
      'desse',
      'devas',
      'devel',
      'devis',
      'devon',
      'devos',
      'devot',
      'dewan',
      'dewar',
      'dewax',
      'dewed',
      'dexes',
      'dexie',
      'dhaba',
      'dhaks',
      'dhals',
      'dhikr',
      'dhobi',
      'dhole',
      'dholl',
      'dhols',
      'dhoti',
      'dhows',
      'dhuti',
      'diact',
      'dials',
      'diane',
      'diazo',
      'dibbs',
      'diced',
      'dicer',
      'dices',
      'dicht',
      'dicks',
      'dicky',
      'dicot',
      'dicta',
      'dicts',
      'dicty',
      'diddy',
      'didie',
      'didos',
      'didst',
      'diebs',
      'diels',
      'diene',
      'diets',
      'diffs',
      'dight',
      'dikas',
      'diked',
      'diker',
      'dikes',
      'dikey',
      'dildo',
      'dilli',
      'dills',
      'dimbo',
      'dimer',
      'dimes',
      'dimps',
      'dinar',
      'dined',
      'dines',
      'dinge',
      'dings',
      'dinic',
      'dinks',
      'dinky',
      'dinna',
      'dinos',
      'dints',
      'diols',
      'diota',
      'dippy',
      'dipso',
      'diram',
      'direr',
      'dirke',
      'dirks',
      'dirls',
      'dirts',
      'disas',
      'disci',
      'discs',
      'dishy',
      'disks',
      'disme',
      'dital',
      'ditas',
      'dited',
      'dites',
      'ditsy',
      'ditts',
      'ditzy',
      'divan',
      'divas',
      'dived',
      'dives',
      'divis',
      'divna',
      'divos',
      'divot',
      'divvy',
      'diwan',
      'dixie',
      'dixit',
      'diyas',
      'dizen',
      'djinn',
      'djins',
      'doabs',
      'doats',
      'dobby',
      'dobes',
      'dobie',
      'dobla',
      'dobra',
      'dobro',
      'docht',
      'docks',
      'docos',
      'docus',
      'doddy',
      'dodos',
      'doeks',
      'doers',
      'doest',
      'doeth',
      'doffs',
      'dogan',
      'doges',
      'dogey',
      'doggo',
      'doggy',
      'dogie',
      'dohyo',
      'doilt',
      'doily',
      'doits',
      'dojos',
      'dolce',
      'dolci',
      'doled',
      'doles',
      'dolia',
      'dolls',
      'dolma',
      'dolor',
      'dolos',
      'dolts',
      'domal',
      'domed',
      'domes',
      'domic',
      'donah',
      'donas',
      'donee',
      'doner',
      'donga',
      'dongs',
      'donko',
      'donna',
      'donne',
      'donny',
      'donsy',
      'doobs',
      'dooce',
      'doody',
      'dooks',
      'doole',
      'dools',
      'dooly',
      'dooms',
      'doomy',
      'doona',
      'doorn',
      'doors',
      'doozy',
      'dopas',
      'doped',
      'doper',
      'dopes',
      'dorad',
      'dorba',
      'dorbs',
      'doree',
      'dores',
      'doric',
      'doris',
      'dorks',
      'dorky',
      'dorms',
      'dormy',
      'dorps',
      'dorrs',
      'dorsa',
      'dorse',
      'dorts',
      'dorty',
      'dosai',
      'dosas',
      'dosed',
      'doseh',
      'doser',
      'doses',
      'dosha',
      'dotal',
      'doted',
      'doter',
      'dotes',
      'dotty',
      'douar',
      'douce',
      'doucs',
      'douks',
      'doula',
      'douma',
      'doums',
      'doups',
      'doura',
      'douse',
      'douts',
      'doved',
      'doven',
      'dover',
      'doves',
      'dovie',
      'dowar',
      'dowds',
      'dowed',
      'dower',
      'dowie',
      'dowle',
      'dowls',
      'dowly',
      'downa',
      'downs',
      'dowps',
      'dowse',
      'dowts',
      'doxed',
      'doxes',
      'doxie',
      'doyen',
      'doyly',
      'dozed',
      'dozer',
      'dozes',
      'drabs',
      'drack',
      'draco',
      'draff',
      'drags',
      'drail',
      'drams',
      'drant',
      'draps',
      'drats',
      'drave',
      'draws',
      'drays',
      'drear',
      'dreck',
      'dreed',
      'dreer',
      'drees',
      'dregs',
      'dreks',
      'drent',
      'drere',
      'drest',
      'dreys',
      'dribs',
      'drice',
      'dries',
      'drily',
      'drips',
      'dript',
      'droid',
      'droil',
      'droke',
      'drole',
      'drome',
      'drony',
      'droob',
      'droog',
      'drook',
      'drops',
      'dropt',
      'drouk',
      'drows',
      'drubs',
      'drugs',
      'drums',
      'drupe',
      'druse',
      'drusy',
      'druxy',
      'dryad',
      'dryas',
      'dsobo',
      'dsomo',
      'duads',
      'duals',
      'duans',
      'duars',
      'dubbo',
      'ducal',
      'ducat',
      'duces',
      'ducks',
      'ducky',
      'ducts',
      'duddy',
      'duded',
      'dudes',
      'duels',
      'duets',
      'duett',
      'duffs',
      'dufus',
      'duing',
      'duits',
      'dukas',
      'duked',
      'dukes',
      'dukka',
      'dulce',
      'dules',
      'dulia',
      'dulls',
      'dulse',
      'dumas',
      'dumbo',
      'dumbs',
      'dumka',
      'dumky',
      'dumps',
      'dunam',
      'dunch',
      'dunes',
      'dungs',
      'dungy',
      'dunks',
      'dunno',
      'dunny',
      'dunsh',
      'dunts',
      'duomi',
      'duomo',
      'duped',
      'duper',
      'dupes',
      'duple',
      'duply',
      'duppy',
      'dural',
      'duras',
      'dured',
      'dures',
      'durgy',
      'durns',
      'duroc',
      'duros',
      'duroy',
      'durra',
      'durrs',
      'durry',
      'durst',
      'durum',
      'durzi',
      'dusks',
      'dusts',
      'duxes',
      'dwaal',
      'dwale',
      'dwalm',
      'dwams',
      'dwang',
      'dwaum',
      'dweeb',
      'dwile',
      'dwine',
      'dyads',
      'dyers',
      'dyked',
      'dykes',
      'dykey',
      'dykon',
      'dynel',
      'dynes',
      'dzhos',
      'eagre',
      'ealed',
      'eales',
      'eaned',
      'eards',
      'eared',
      'earls',
      'earns',
      'earnt',
      'earst',
      'eased',
      'easer',
      'eases',
      'easle',
      'easts',
      'eathe',
      'eaved',
      'eaves',
      'ebbed',
      'ebbet',
      'ebons',
      'ebook',
      'ecads',
      'eched',
      'eches',
      'echos',
      'ecrus',
      'edema',
      'edged',
      'edger',
      'edges',
      'edile',
      'edits',
      'educe',
      'educt',
      'eejit',
      'eensy',
      'eeven',
      'eevns',
      'effed',
      'egads',
      'egers',
      'egest',
      'eggar',
      'egged',
      'egger',
      'egmas',
      'ehing',
      'eider',
      'eidos',
      'eigne',
      'eiked',
      'eikon',
      'eilds',
      'eisel',
      'ejido',
      'ekkas',
      'elain',
      'eland',
      'elans',
      'elchi',
      'eldin',
      'elemi',
      'elfed',
      'eliad',
      'elint',
      'elmen',
      'eloge',
      'elogy',
      'eloin',
      'elops',
      'elpee',
      'elsin',
      'elute',
      'elvan',
      'elven',
      'elver',
      'elves',
      'emacs',
      'embar',
      'embay',
      'embog',
      'embow',
      'embox',
      'embus',
      'emeer',
      'emend',
      'emerg',
      'emery',
      'emeus',
      'emics',
      'emirs',
      'emits',
      'emmas',
      'emmer',
      'emmet',
      'emmew',
      'emmys',
      'emoji',
      'emong',
      'emote',
      'emove',
      'empts',
      'emule',
      'emure',
      'emyde',
      'emyds',
      'enarm',
      'enate',
      'ended',
      'ender',
      'endew',
      'endue',
      'enews',
      'enfix',
      'eniac',
      'enlit',
      'enmew',
      'ennog',
      'enoki',
      'enols',
      'enorm',
      'enows',
      'enrol',
      'ensew',
      'ensky',
      'entia',
      'enure',
      'enurn',
      'envoi',
      'enzym',
      'eorls',
      'eosin',
      'epact',
      'epees',
      'ephah',
      'ephas',
      'ephod',
      'ephor',
      'epics',
      'epode',
      'epopt',
      'epris',
      'eques',
      'equid',
      'erbia',
      'erevs',
      'ergon',
      'ergos',
      'ergot',
      'erhus',
      'erica',
      'erick',
      'erics',
      'ering',
      'erned',
      'ernes',
      'erose',
      'erred',
      'erses',
      'eruct',
      'erugo',
      'eruvs',
      'erven',
      'ervil',
      'escar',
      'escot',
      'esile',
      'eskar',
      'esker',
      'esnes',
      'esses',
      'estoc',
      'estop',
      'estro',
      'etage',
      'etape',
      'etats',
      'etens',
      'ethal',
      'ethne',
      'ethyl',
      'etics',
      'etnas',
      'ettin',
      'ettle',
      'etuis',
      'etwee',
      'etyma',
      'eughs',
      'euked',
      'eupad',
      'euros',
      'eusol',
      'evens',
      'evert',
      'evets',
      'evhoe',
      'evils',
      'evite',
      'evohe',
      'ewers',
      'ewest',
      'ewhow',
      'ewked',
      'exams',
      'exeat',
      'execs',
      'exeem',
      'exeme',
      'exfil',
      'exies',
      'exine',
      'exing',
      'exits',
      'exode',
      'exome',
      'exons',
      'expat',
      'expos',
      'exude',
      'exuls',
      'exurb',
      'eyass',
      'eyers',
      'eyots',
      'eyras',
      'eyres',
      'eyrie',
      'eyrir',
      'ezine',
      'fabby',
      'faced',
      'facer',
      'faces',
      'facia',
      'facta',
      'facts',
      'faddy',
      'faded',
      'fader',
      'fades',
      'fadge',
      'fados',
      'faena',
      'faery',
      'faffs',
      'faffy',
      'faggy',
      'fagin',
      'fagot',
      'faiks',
      'fails',
      'faine',
      'fains',
      'fairs',
      'faked',
      'faker',
      'fakes',
      'fakey',
      'fakie',
      'fakir',
      'falaj',
      'falls',
      'famed',
      'fames',
      'fanal',
      'fands',
      'fanes',
      'fanga',
      'fango',
      'fangs',
      'fanks',
      'fanon',
      'fanos',
      'fanum',
      'faqir',
      'farad',
      'farci',
      'farcy',
      'fards',
      'fared',
      'farer',
      'fares',
      'farle',
      'farls',
      'farms',
      'faros',
      'farro',
      'farse',
      'farts',
      'fasci',
      'fasti',
      'fasts',
      'fated',
      'fates',
      'fatly',
      'fatso',
      'fatwa',
      'faugh',
      'fauld',
      'fauns',
      'faurd',
      'fauts',
      'fauve',
      'favas',
      'favel',
      'faver',
      'faves',
      'favus',
      'fawns',
      'fawny',
      'faxed',
      'faxes',
      'fayed',
      'fayer',
      'fayne',
      'fayre',
      'fazed',
      'fazes',
      'feals',
      'feare',
      'fears',
      'feart',
      'fease',
      'feats',
      'feaze',
      'feces',
      'fecht',
      'fecit',
      'fecks',
      'fedex',
      'feebs',
      'feeds',
      'feels',
      'feens',
      'feers',
      'feese',
      'feeze',
      'fehme',
      'feint',
      'feist',
      'felch',
      'felid',
      'fells',
      'felly',
      'felts',
      'felty',
      'femal',
      'femes',
      'femmy',
      'fends',
      'fendy',
      'fenis',
      'fenks',
      'fenny',
      'fents',
      'feods',
      'feoff',
      'ferer',
      'feres',
      'feria',
      'ferly',
      'fermi',
      'ferms',
      'ferns',
      'ferny',
      'fesse',
      'festa',
      'fests',
      'festy',
      'fetas',
      'feted',
      'fetes',
      'fetor',
      'fetta',
      'fetts',
      'fetwa',
      'feuar',
      'feuds',
      'feued',
      'feyed',
      'feyer',
      'feyly',
      'fezes',
      'fezzy',
      'fiars',
      'fiats',
      'fibro',
      'fices',
      'fiche',
      'fichu',
      'ficin',
      'ficos',
      'fides',
      'fidge',
      'fidos',
      'fiefs',
      'fient',
      'fiere',
      'fiers',
      'fiest',
      'fifed',
      'fifer',
      'fifes',
      'fifis',
      'figgy',
      'figos',
      'fiked',
      'fikes',
      'filar',
      'filch',
      'filed',
      'files',
      'filii',
      'filks',
      'fille',
      'fillo',
      'fills',
      'filmi',
      'films',
      'filos',
      'filum',
      'finca',
      'finds',
      'fined',
      'fines',
      'finis',
      'finks',
      'finny',
      'finos',
      'fiord',
      'fiqhs',
      'fique',
      'fired',
      'firer',
      'fires',
      'firie',
      'firks',
      'firms',
      'firns',
      'firry',
      'firth',
      'fiscs',
      'fisks',
      'fists',
      'fisty',
      'fitch',
      'fitly',
      'fitna',
      'fitte',
      'fitts',
      'fiver',
      'fives',
      'fixed',
      'fixes',
      'fixit',
      'fjeld',
      'flabs',
      'flaff',
      'flags',
      'flaks',
      'flamm',
      'flams',
      'flamy',
      'flane',
      'flans',
      'flaps',
      'flary',
      'flats',
      'flava',
      'flawn',
      'flaws',
      'flawy',
      'flaxy',
      'flays',
      'fleam',
      'fleas',
      'fleek',
      'fleer',
      'flees',
      'flegs',
      'fleme',
      'fleur',
      'flews',
      'flexi',
      'flexo',
      'fleys',
      'flics',
      'flied',
      'flies',
      'flimp',
      'flims',
      'flips',
      'flirs',
      'flisk',
      'flite',
      'flits',
      'flitt',
      'flobs',
      'flocs',
      'floes',
      'flogs',
      'flong',
      'flops',
      'flors',
      'flory',
      'flosh',
      'flota',
      'flote',
      'flows',
      'flubs',
      'flued',
      'flues',
      'fluey',
      'fluky',
      'flump',
      'fluor',
      'flurr',
      'fluty',
      'fluyt',
      'flyby',
      'flype',
      'flyte',
      'foals',
      'foams',
      'foehn',
      'fogey',
      'fogie',
      'fogle',
      'fogou',
      'fohns',
      'foids',
      'foils',
      'foins',
      'folds',
      'foley',
      'folia',
      'folic',
      'folie',
      'folks',
      'folky',
      'fomes',
      'fonda',
      'fonds',
      'fondu',
      'fones',
      'fonly',
      'fonts',
      'foods',
      'foody',
      'fools',
      'foots',
      'footy',
      'foram',
      'forbs',
      'forby',
      'fordo',
      'fords',
      'forel',
      'fores',
      'forex',
      'forks',
      'forky',
      'forme',
      'forms',
      'forts',
      'forza',
      'forze',
      'fossa',
      'fosse',
      'fouat',
      'fouds',
      'fouer',
      'fouet',
      'foule',
      'fouls',
      'fount',
      'fours',
      'fouth',
      'fovea',
      'fowls',
      'fowth',
      'foxed',
      'foxes',
      'foxie',
      'foyle',
      'foyne',
      'frabs',
      'frack',
      'fract',
      'frags',
      'fraim',
      'franc',
      'frape',
      'fraps',
      'frass',
      'frate',
      'frati',
      'frats',
      'fraus',
      'frays',
      'frees',
      'freet',
      'freit',
      'fremd',
      'frena',
      'freon',
      'frere',
      'frets',
      'fribs',
      'frier',
      'fries',
      'frigs',
      'frise',
      'frist',
      'frith',
      'frits',
      'fritt',
      'frize',
      'frizz',
      'froes',
      'frogs',
      'frons',
      'frore',
      'frorn',
      'frory',
      'frosh',
      'frows',
      'frowy',
      'frugs',
      'frump',
      'frush',
      'frust',
      'fryer',
      'fubar',
      'fubby',
      'fubsy',
      'fucks',
      'fucus',
      'fuddy',
      'fudgy',
      'fuels',
      'fuero',
      'fuffs',
      'fuffy',
      'fugal',
      'fuggy',
      'fugie',
      'fugio',
      'fugle',
      'fugly',
      'fugus',
      'fujis',
      'fulls',
      'fumed',
      'fumer',
      'fumes',
      'fumet',
      'fundi',
      'funds',
      'fundy',
      'fungo',
      'fungs',
      'funks',
      'fural',
      'furan',
      'furca',
      'furls',
      'furol',
      'furrs',
      'furth',
      'furze',
      'furzy',
      'fused',
      'fusee',
      'fusel',
      'fuses',
      'fusil',
      'fusks',
      'fusts',
      'fusty',
      'futon',
      'fuzed',
      'fuzee',
      'fuzes',
      'fuzil',
      'fyces',
      'fyked',
      'fykes',
      'fyles',
      'fyrds',
      'fytte',
      'gabba',
      'gabby',
      'gable',
      'gaddi',
      'gades',
      'gadge',
      'gadid',
      'gadis',
      'gadje',
      'gadjo',
      'gadso',
      'gaffs',
      'gaged',
      'gager',
      'gages',
      'gaids',
      'gains',
      'gairs',
      'gaita',
      'gaits',
      'gaitt',
      'gajos',
      'galah',
      'galas',
      'galax',
      'galea',
      'galed',
      'gales',
      'galls',
      'gally',
      'galop',
      'galut',
      'galvo',
      'gamas',
      'gamay',
      'gamba',
      'gambe',
      'gambo',
      'gambs',
      'gamed',
      'games',
      'gamey',
      'gamic',
      'gamin',
      'gamme',
      'gammy',
      'gamps',
      'ganch',
      'gandy',
      'ganef',
      'ganev',
      'gangs',
      'ganja',
      'ganof',
      'gants',
      'gaols',
      'gaped',
      'gaper',
      'gapes',
      'gapos',
      'gappy',
      'garbe',
      'garbo',
      'garbs',
      'garda',
      'gares',
      'garis',
      'garms',
      'garni',
      'garre',
      'garth',
      'garum',
      'gases',
      'gasps',
      'gaspy',
      'gasts',
      'gatch',
      'gated',
      'gater',
      'gates',
      'gaths',
      'gator',
      'gauch',
      'gaucy',
      'gauds',
      'gauje',
      'gault',
      'gaums',
      'gaumy',
      ' ',
      'gaurs',
      'gauss',
      'gauzy',
      'gavot',
      'gawcy',
      'gawds',
      'gawks',
      'gawps',
      'gawsy',
      'gayal',
      'gazal',
      'gazar',
      'gazed',
      'gazes',
      'gazon',
      'gazoo',
      'geals',
      'geans',
      'geare',
      'gears',
      'geats',
      'gebur',
      'gecks',
      'geeks',
      'geeps',
      'geest',
      'geist',
      'geits',
      'gelds',
      'gelee',
      'gelid',
      'gelly',
      'gelts',
      'gemel',
      'gemma',
      'gemmy',
      'gemot',
      'genal',
      'genas',
      'genes',
      'genet',
      'genic',
      'genii',
      'genip',
      'genny',
      'genoa',
      'genom',
      'genro',
      'gents',
      'genty',
      'genua',
      'genus',
      'geode',
      'geoid',
      'gerah',
      'gerbe',
      'geres',
      'gerle',
      'germs',
      'germy',
      'gerne',
      'gesse',
      'gesso',
      'geste',
      'gests',
      'getas',
      'getup',
      'geums',
      'geyan',
      'geyer',
      'ghast',
      'ghats',
      'ghaut',
      'ghazi',
      'ghees',
      'ghest',
      'ghyll',
      'gibed',
      'gibel',
      'giber',
      'gibes',
      'gibli',
      'gibus',
      'gifts',
      'gigas',
      'gighe',
      'gigot',
      'gigue',
      'gilas',
      'gilds',
      'gilet',
      'gills',
      'gilly',
      'gilpy',
      'gilts',
      'gimel',
      'gimme',
      'gimps',
      'gimpy',
      'ginch',
      'ginge',
      'gings',
      'ginks',
      'ginny',
      'ginzo',
      'gipon',
      'gippo',
      'gippy',
      'girds',
      'girls',
      'girns',
      'giron',
      'giros',
      'girrs',
      'girsh',
      'girts',
      'gismo',
      'gisms',
      'gists',
      'gitch',
      'gites',
      'giust',
      'gived',
      'gives',
      'gizmo',
      'glace',
      'glads',
      'glady',
      'glaik',
      'glair',
      'glams',
      'glans',
      'glary',
      'glaum',
      'glaur',
      'glazy',
      'gleba',
      'glebe',
      'gleby',
      'glede',
      'gleds',
      'gleed',
      'gleek',
      'glees',
      'gleet',
      'gleis',
      'glens',
      'glent',
      'gleys',
      'glial',
      'glias',
      'glibs',
      'gliff',
      'glift',
      'glike',
      'glime',
      'glims',
      'glisk',
      'glits',
      'glitz',
      'gloam',
      'globi',
      'globs',
      'globy',
      'glode',
      'glogg',
      'gloms',
      'gloop',
      'glops',
      'glost',
      'glout',
      'glows',
      'gloze',
      'glued',
      'gluer',
      'glues',
      'gluey',
      'glugs',
      'glume',
      'glums',
      'gluon',
      'glute',
      'gluts',
      'gnarl',
      'gnarr',
      'gnars',
      'gnats',
      'gnawn',
      'gnaws',
      'gnows',
      'goads',
      'goafs',
      'goals',
      'goary',
      'goats',
      'goaty',
      'goban',
      'gobar',
      'gobbi',
      'gobbo',
      'gobby',
      'gobis',
      'gobos',
      'godet',
      'godso',
      'goels',
      'goers',
      'goest',
      'goeth',
      'goety',
      'gofer',
      'goffs',
      'gogga',
      'gogos',
      'goier',
      'gojis',
      'golds',
      'goldy',
      'goles',
      'golfs',
      'golpe',
      'golps',
      'gombo',
      'gomer',
      'gompa',
      'gonch',
      'gonef',
      'gongs',
      'gonia',
      'gonif',
      'gonks',
      'gonna',
      'gonof',
      'gonys',
      'gonzo',
      'gooby',
      'goods',
      'goofs',
      'googs',
      'gooks',
      'gooky',
      'goold',
      'gools',
      'gooly',
      'goons',
      'goony',
      'goops',
      'goopy',
      'goors',
      'goory',
      'goosy',
      'gopak',
      'gopik',
      'goral',
      'goras',
      'gored',
      'gores',
      'goris',
      'gorms',
      'gormy',
      'gorps',
      'gorse',
      'gorsy',
      'gosht',
      'gosse',
      'gotch',
      'goths',
      'gothy',
      'gotta',
      'gouch',
      'gouks',
      'goura',
      'gouts',
      'gouty',
      'gowan',
      'gowds',
      'gowfs',
      'gowks',
      'gowls',
      'gowns',
      'goxes',
      'goyim',
      'goyle',
      'graal',
      'grabs',
      'grads',
      'graff',
      'graip',
      'grama',
      'grame',
      'gramp',
      'grams',
      'grana',
      'grans',
      'grapy',
      'gravs',
      'grays',
      'grebe',
      'grebo',
      'grece',
      'greek',
      'grees',
      'grege',
      'grego',
      'grein',
      'grens',
      'grese',
      'greve',
      'grews',
      'greys',
      'grice',
      'gride',
      'grids',
      'griff',
      'grift',
      'grigs',
      'grike',
      'grins',
      'griot',
      'grips',
      'gript',
      'gripy',
      'grise',
      'grist',
      'grisy',
      'grith',
      'grits',
      'grize',
      'groat',
      'grody',
      'grogs',
      'groks',
      'groma',
      'grone',
      'groof',
      'grosz',
      'grots',
      'grouf',
      'grovy',
      'grows',
      'grrls',
      'grrrl',
      'grubs',
      'grued',
      'grues',
      'grufe',
      'grume',
      'grump',
      'grund',
      'gryce',
      'gryde',
      'gryke',
      'grype',
      'grypt',
      'guaco',
      'guana',
      'guano',
      'guans',
      'guars',
      'gucks',
      'gucky',
      'gudes',
      'guffs',
      'gugas',
      'guids',
      'guimp',
      'guiro',
      'gulag',
      'gular',
      'gulas',
      'gules',
      'gulet',
      'gulfs',
      'gulfy',
      'gulls',
      'gulph',
      'gulps',
      'gulpy',
      'gumma',
      'gummi',
      'gumps',
      'gundy',
      'gunge',
      'gungy',
      'gunks',
      'gunky',
      'gunny',
      'guqin',
      'gurdy',
      'gurge',
      'gurls',
      'gurly',
      'gurns',
      'gurry',
      'gursh',
      'gurus',
      'gushy',
      'gusla',
      'gusle',
      'gusli',
      'gussy',
      'gusts',
      'gutsy',
      'gutta',
      'gutty',
      'guyed',
      'guyle',
      'guyot',
      'guyse',
      'gwine',
      'gyals',
      'gyans',
      'gybed',
      'gybes',
      'gyeld',
      'gymps',
      'gynae',
      'gynie',
      'gynny',
      'gynos',
      'gyoza',
      'gypos',
      'gyppo',
      'gyppy',
      'gyral',
      'gyred',
      'gyres',
      'gyron',
      'gyros',
      'gyrus',
      'gytes',
      'gyved',
      'gyves',
      'haafs',
      'haars',
      'hable',
      'habus',
      'hacek',
      'hacks',
      'hadal',
      'haded',
      'hades',
      'hadji',
      'hadst',
      'haems',
      'haets',
      'haffs',
      'hafiz',
      'hafts',
      'haggs',
      'hahas',
      'haick',
      'haika',
      'haiks',
      'haiku',
      'hails',
      'haily',
      'hains',
      'haint',
      'hairs',
      'haith',
      'hajes',
      'hajis',
      'hajji',
      'hakam',
      'hakas',
      'hakea',
      'hakes',
      'hakim',
      'hakus',
      'halal',
      'haled',
      'haler',
      'hales',
      'halfa',
      'halfs',
      'halid',
      'hallo',
      'halls',
      'halma',
      'halms',
      'halon',
      'halos',
      'halse',
      'halts',
      'halva',
      'halwa',
      'hamal',
      'hamba',
      'hamed',
      'hames',
      'hammy',
      'hamza',
      'hanap',
      'hance',
      'hanch',
      'hands',
      'hangi',
      'hangs',
      'hanks',
      'hanky',
      'hansa',
      'hanse',
      'hants',
      'haole',
      'haoma',
      'hapax',
      'haply',
      'happi',
      'hapus',
      'haram',
      'hards',
      'hared',
      'hares',
      'harim',
      'harks',
      'harls',
      'harms',
      'harns',
      'haros',
      'harps',
      'harts',
      'hashy',
      'hasks',
      'hasps',
      'hasta',
      'hated',
      'hates',
      'hatha',
      'hauds',
      'haufs',
      'haugh',
      'hauld',
      'haulm',
      'hauls',
      'hault',
      'hauns',
      'hause',
      'haver',
      'haves',
      'hawed',
      'hawks',
      'hawms',
      'hawse',
      'hayed',
      'hayer',
      'hayey',
      'hayle',
      'hazan',
      'hazed',
      'hazer',
      'hazes',
      'heads',
      'heald',
      'heals',
      'heame',
      'heaps',
      'heapy',
      'heare',
      'hears',
      'heast',
      'heats',
      'heben',
      'hebes',
      'hecht',
      'hecks',
      'heder',
      'hedgy',
      'heeds',
      'heedy',
      'heels',
      'heeze',
      'hefte',
      'hefts',
      'heids',
      'heigh',
      'heils',
      'heirs',
      'hejab',
      'hejra',
      'heled',
      'heles',
      'helio',
      'hells',
      'helms',
      'helos',
      'helot',
      'helps',
      'helve',
      'hemal',
      'hemes',
      'hemic',
      'hemin',
      'hemps',
      'hempy',
      'hench',
      'hends',
      'henge',
      'henna',
      'henny',
      'henry',
      'hents',
      'hepar',
      'herbs',
      'herby',
      'herds',
      'heres',
      'herls',
      'herma',
      'herms',
      'herns',
      'heros',
      'herry',
      'herse',
      'hertz',
      'herye',
      'hesps',
      'hests',
      'hetes',
      'heths',
      'heuch',
      'heugh',
      'hevea',
      'hewed',
      'hewer',
      'hewgh',
      'hexad',
      'hexed',
      'hexer',
      'hexes',
      'hexyl',
      'heyed',
      'hiant',
      'hicks',
      'hided',
      'hider',
      'hides',
      'hiems',
      'highs',
      'hight',
      'hijab',
      'hijra',
      'hiked',
      'hiker',
      'hikes',
      'hikoi',
      'hilar',
      'hilch',
      'hillo',
      'hills',
      'hilts',
      'hilum',
      'hilus',
      'himbo',
      'hinau',
      'hinds',
      'hings',
      'hinky',
      'hinny',
      'hints',
      'hiois',
      'hiply',
      'hired',
      'hiree',
      'hirer',
      'hires',
      'hissy',
      'hists',
      'hithe',
      'hived',
      'hiver',
      'hives',
      'hizen',
      'hoaed',
      'hoagy',
      'hoars',
      'hoary',
      'hoast',
      'hobos',
      'hocks',
      'hocus',
      'hodad',
      'hodja',
      'hoers',
      'hogan',
      'hogen',
      'hoggs',
      'hoghs',
      'hohed',
      'hoick',
      'hoied',
      'hoiks',
      'hoing',
      'hoise',
      'hokas',
      'hoked',
      'hokes',
      'hokey',
      'hokis',
      'hokku',
      'hokum',
      'holds',
      'holed',
      'holes',
      'holey',
      'holks',
      'holla',
      'hollo',
      'holme',
      'holms',
      'holon',
      'holos',
      'holts',
      'homas',
      'homed',
      'homes',
      'homey',
      'homie',
      'homme',
      'homos',
      'honan',
      'honda',
      'honds',
      'honed',
      'honer',
      'hones',
      'hongi',
      'hongs',
      'honks',
      'honky',
      'hooch',
      'hoods',
      'hoody',
      'hooey',
      'hoofs',
      'hooka',
      'hooks',
      'hooky',
      'hooly',
      'hoons',
      'hoops',
      'hoord',
      'hoors',
      'hoosh',
      'hoots',
      'hooty',
      'hoove',
      'hopak',
      'hoped',
      'hoper',
      'hopes',
      'hoppy',
      'horah',
      'horal',
      'horas',
      'horis',
      'horks',
      'horme',
      'horns',
      'horst',
      'horsy',
      'hosed',
      'hosel',
      'hosen',
      'hoser',
      'hoses',
      'hosey',
      'hosta',
      'hosts',
      'hotch',
      'hoten',
      'hotty',
      'houff',
      'houfs',
      'hough',
      'houri',
      'hours',
      'houts',
      'hovea',
      'hoved',
      'hoven',
      'hoves',
      'howbe',
      'howes',
      'howff',
      'howfs',
      'howks',
      'howls',
      'howre',
      'howso',
      'hoxed',
      'hoxes',
      'hoyas',
      'hoyed',
      'hoyle',
      'hubby',
      'hucks',
      'hudna',
      'hudud',
      'huers',
      'huffs',
      'huffy',
      'huger',
      'huggy',
      'huhus',
      'huias',
      'hulas',
      'hules',
      'hulks',
      'hulky',
      'hullo',
      'hulls',
      'hully',
      'humas',
      'humfs',
      'humic',
      'humps',
      'humpy',
      'hunks',
      'hunts',
      'hurds',
      'hurls',
      'hurly',
      'hurra',
      'hurst',
      'hurts',
      'hushy',
      'husks',
      'husos',
      'hutia',
      'huzza',
      'huzzy',
      'hwyls',
      'hydra',
      'hyens',
      'hygge',
      'hying',
      'hykes',
      'hylas',
      'hyleg',
      'hyles',
      'hylic',
      'hymns',
      'hynde',
      'hyoid',
      'hyped',
      'hypes',
      'hypha',
      'hyphy',
      'hypos',
      'hyrax',
      'hyson',
      'hythe',
      'iambi',
      'iambs',
      'ibrik',
      'icers',
      'iched',
      'iches',
      'ichor',
      'icier',
      'icker',
      'ickle',
      'icons',
      'ictal',
      'ictic',
      'ictus',
      'idant',
      'ideas',
      'idees',
      'ident',
      'idled',
      'idles',
      'idola',
      'idols',
      'idyls',
      'iftar',
      'igapo',
      'igged',
      'iglus',
      'ihram',
      'ikans',
      'ikats',
      'ikons',
      'ileac',
      'ileal',
      'ileum',
      'ileus',
      'iliad',
      'ilial',
      'ilium',
      'iller',
      'illth',
      'imago',
      'imams',
      'imari',
      'imaum',
      'imbar',
      'imbed',
      'imide',
      'imido',
      'imids',
      'imine',
      'imino',
      'immew',
      'immit',
      'immix',
      'imped',
      'impis',
      'impot',
      'impro',
      'imshi',
      'imshy',
      'inapt',
      'inarm',
      'inbye',
      'incel',
      'incle',
      'incog',
      'incus',
      'incut',
      'indew',
      'india',
      'indie',
      'indol',
      'indow',
      'indri',
      'indue',
      'inerm',
      'infix',
      'infos',
      'infra',
      'ingan',
      'ingle',
      'inion',
      'inked',
      'inker',
      'inkle',
      'inned',
      'innit',
      'inorb',
      'inrun',
      'inset',
      'inspo',
      'intel',
      'intil',
      'intis',
      'intra',
      'inula',
      'inure',
      'inurn',
      'inust',
      'invar',
      'inwit',
      'iodic',
      'iodid',
      'iodin',
      'iotas',
      'ippon',
      'irade',
      'irids',
      'iring',
      'irked',
      'iroko',
      'irone',
      'irons',
      'isbas',
      'ishes',
      'isled',
      'isles',
      'isnae',
      'issei',
      'istle',
      'items',
      'ither',
      'ivied',
      'ivies',
      'ixias',
      'ixnay',
      'ixora',
      'ixtle',
      'izard',
      'izars',
      'izzat',
      'jaaps',
      'jabot',
      'jacal',
      'jacks',
      'jacky',
      'jaded',
      'jades',
      'jafas',
      'jaffa',
      'jagas',
      'jager',
      'jaggs',
      'jaggy',
      'jagir',
      'jagra',
      'jails',
      'jaker',
      'jakes',
      'jakey',
      'jalap',
      'jalop',
      'jambe',
      'jambo',
      'jambs',
      'jambu',
      'james',
      'jammy',
      'jamon',
      'janes',
      'janns',
      'janny',
      'janty',
      'japan',
      'japed',
      'japer',
      'japes',
      'jarks',
      'jarls',
      'jarps',
      'jarta',
      'jarul',
      'jasey',
      'jaspe',
      'jasps',
      'jatos',
      'jauks',
      'jaups',
      'javas',
      'javel',
      'jawan',
      'jawed',
      'jaxie',
      'jeans',
      'jeats',
      'jebel',
      'jedis',
      'jeels',
      'jeely',
      'jeeps',
      'jeers',
      'jeeze',
      'jefes',
      'jeffs',
      'jehad',
      'jehus',
      'jelab',
      'jello',
      'jells',
      'jembe',
      'jemmy',
      'jenny',
      'jeons',
      'jerid',
      'jerks',
      'jerry',
      'jesse',
      'jests',
      'jesus',
      'jetes',
      'jeton',
      'jeune',
      'jewed',
      'jewie',
      'jhala',
      'jiaos',
      'jibba',
      'jibbs',
      'jibed',
      'jiber',
      'jibes',
      'jiffs',
      'jiggy',
      'jigot',
      'jihad',
      'jills',
      'jilts',
      'jimmy',
      'jimpy',
      'jingo',
      'jinks',
      'jinne',
      'jinni',
      'jinns',
      'jirds',
      'jirga',
      'jirre',
      'jisms',
      'jived',
      'jiver',
      'jives',
      'jivey',
      'jnana',
      'jobed',
      'jobes',
      'jocko',
      'jocks',
      'jocky',
      'jocos',
      'jodel',
      'joeys',
      'johns',
      'joins',
      'joked',
      'jokes',
      'jokey',
      'jokol',
      'joled',
      'joles',
      'jolls',
      'jolts',
      'jolty',
      'jomon',
      'jomos',
      'jones',
      'jongs',
      'jonty',
      'jooks',
      'joram',
      'jorum',
      'jotas',
      'jotty',
      'jotun',
      'joual',
      'jougs',
      'jouks',
      'joule',
      'jours',
      'jowar',
      'jowed',
      'jowls',
      'jowly',
      'joyed',
      'jubas',
      'jubes',
      'jucos',
      'judas',
      'judgy',
      'judos',
      'jugal',
      'jugum',
      'jujus',
      'juked',
      'jukes',
      'jukus',
      'julep',
      'jumar',
      'jumby',
      'jumps',
      'junco',
      'junks',
      'junky',
      'jupes',
      'jupon',
      'jural',
      'jurat',
      'jurel',
      'jures',
      'justs',
      'jutes',
      'jutty',
      'juves',
      'juvie',
      'kaama',
      'kabab',
      'kabar',
      'kabob',
      'kacha',
      'kacks',
      'kadai',
      'kades',
      'kadis',
      'kafir',
      'kagos',
      'kagus',
      'kahal',
      'kaiak',
      'kaids',
      'kaies',
      'kaifs',
      'kaika',
      'kaiks',
      'kails',
      'kaims',
      'kaing',
      'kains',
      'kakas',
      'kakis',
      'kalam',
      'kales',
      'kalif',
      'kalis',
      'kalpa',
      'kamas',
      'kames',
      'kamik',
      'kamis',
      'kamme',
      'kanae',
      'kanas',
      'kandy',
      'kaneh',
      'kanes',
      'kanga',
      'kangs',
      'kanji',
      'kants',
      'kanzu',
      'kaons',
      'kapas',
      'kaphs',
      'kapok',
      'kapow',
      'kapus',
      'kaput',
      'karas',
      'karat',
      'karks',
      'karns',
      'karoo',
      'karos',
      'karri',
      'karst',
      'karsy',
      'karts',
      'karzy',
      'kasha',
      'kasme',
      'katal',
      'katas',
      'katis',
      'katti',
      'kaugh',
      'kauri',
      'kauru',
      'kaury',
      'kaval',
      'kavas',
      'kawas',
      'kawau',
      'kawed',
      'kayle',
      'kayos',
      'kazis',
      'kazoo',
      'kbars',
      'kebar',
      'kebob',
      'kecks',
      'kedge',
      'kedgy',
      'keech',
      'keefs',
      'keeks',
      'keels',
      'keema',
      'keeno',
      'keens',
      'keeps',
      'keets',
      'keeve',
      'kefir',
      'kehua',
      'keirs',
      'kelep',
      'kelim',
      'kells',
      'kelly',
      'kelps',
      'kelpy',
      'kelts',
      'kelty',
      'kembo',
      'kembs',
      'kemps',
      'kempt',
      'kempy',
      'kenaf',
      'kench',
      'kendo',
      'kenos',
      'kente',
      'kents',
      'kepis',
      'kerbs',
      'kerel',
      'kerfs',
      'kerky',
      'kerma',
      'kerne',
      'kerns',
      'keros',
      'kerry',
      'kerve',
      'kesar',
      'kests',
      'ketas',
      'ketch',
      'ketes',
      'ketol',
      'kevel',
      'kevil',
      'kexes',
      'keyed',
      'keyer',
      'khadi',
      'khafs',
      'khans',
      'khaph',
      'khats',
      'khaya',
      'khazi',
      'kheda',
      'kheth',
      'khets',
      'khoja',
      'khors',
      'khoum',
      'khuds',
      'kiaat',
      'kiack',
      'kiang',
      'kibbe',
      'kibbi',
      'kibei',
      'kibes',
      'kibla',
      'kicks',
      'kicky',
      'kiddo',
      'kiddy',
      'kidel',
      'kidge',
      'kiefs',
      'kiers',
      'kieve',
      'kievs',
      'kight',
      'kikes',
      'kikoi',
      'kiley',
      'kilim',
      'kills',
      'kilns',
      'kilos',
      'kilps',
      'kilts',
      'kilty',
      'kimbo',
      'kinas',
      'kinda',
      'kinds',
      'kindy',
      'kines',
      'kings',
      'kinin',
      'kinks',
      'kinos',
      'kiore',
      'kipes',
      'kippa',
      'kipps',
      'kirby',
      'kirks',
      'kirns',
      'kirri',
      'kisan',
      'kissy',
      'kists',
      'kited',
      'kiter',
      'kites',
      'kithe',
      'kiths',
      'kitul',
      'kivas',
      'kiwis',
      'klang',
      'klaps',
      'klett',
      'klick',
      'klieg',
      'kliks',
      'klong',
      'kloof',
      'kluge',
      'klutz',
      'knags',
      'knaps',
      'knarl',
      'knars',
      'knaur',
      'knawe',
      'knees',
      'knell',
      'knish',
      'knits',
      'knive',
      'knobs',
      'knops',
      'knosp',
      'knots',
      'knout',
      'knowe',
      'knows',
      'knubs',
      'knurl',
      'knurr',
      'knurs',
      'knuts',
      'koans',
      'koaps',
      'koban',
      'kobos',
      'koels',
      'koffs',
      'kofta',
      'kogal',
      'kohas',
      'kohen',
      'kohls',
      'koine',
      'kojis',
      'kokam',
      'kokas',
      'koker',
      'kokra',
      'kokum',
      'kolas',
      'kolos',
      'kombu',
      'konbu',
      'kondo',
      'konks',
      'kooks',
      'kooky',
      'koori',
      'kopek',
      'kophs',
      'kopje',
      'koppa',
      'korai',
      'koras',
      'korat',
      'kores',
      'korma',
      'koros',
      'korun',
      'korus',
      'koses',
      'kotch',
      'kotos',
      'kotow',
      'koura',
      'kraal',
      'krabs',
      'kraft',
      'krais',
      'krait',
      'krang',
      'krans',
      'kranz',
      'kraut',
      'krays',
      'kreep',
      'kreng',
      'krewe',
      'krona',
      'krone',
      'kroon',
      'krubi',
      'krunk',
      'ksars',
      'kubie',
      'kudos',
      'kudus',
      'kudzu',
      'kufis',
      'kugel',
      'kuias',
      'kukri',
      'kukus',
      'kulak',
      'kulan',
      'kulas',
      'kulfi',
      'kumis',
      'kumys',
      'kuris',
      'kurre',
      'kurta',
      'kurus',
      'kusso',
      'kutas',
      'kutch',
      'kutis',
      'kutus',
      'kuzus',
      'kvass',
      'kvell',
      'kwela',
      'kyack',
      'kyaks',
      'kyang',
      'kyars',
      'kyats',
      'kybos',
      'kydst',
      'kyles',
      'kylie',
      'kylin',
      'kylix',
      'kyloe',
      'kynde',
      'kynds',
      'kypes',
      'kyrie',
      'kytes',
      'kythe',
      'laari',
      'labda',
      'labia',
      'labis',
      'labra',
      'laced',
      'lacer',
      'laces',
      'lacet',
      'lacey',
      'lacks',
      'laddy',
      'laded',
      'lader',
      'lades',
      'laers',
      'laevo',
      'lagan',
      'lahal',
      'lahar',
      'laich',
      'laics',
      'laids',
      'laigh',
      'laika',
      'laiks',
      'laird',
      'lairs',
      'lairy',
      'laith',
      'laity',
      'laked',
      'laker',
      'lakes',
      'lakhs',
      'lakin',
      'laksa',
      'laldy',
      'lalls',
      'lamas',
      'lambs',
      'lamby',
      'lamed',
      'lamer',
      'lames',
      'lamia',
      'lammy',
      'lamps',
      'lanai',
      'lanas',
      'lanch',
      'lande',
      'lands',
      'lanes',
      'lanks',
      'lants',
      'lapin',
      'lapis',
      'lapje',
      'larch',
      'lards',
      'lardy',
      'laree',
      'lares',
      'largo',
      'laris',
      'larks',
      'larky',
      'larns',
      'larnt',
      'larum',
      'lased',
      'laser',
      'lases',
      'lassi',
      'lassu',
      'lassy',
      'lasts',
      'latah',
      'lated',
      'laten',
      'latex',
      'lathi',
      'laths',
      'lathy',
      'latke',
      'latus',
      'lauan',
      'lauch',
      'lauds',
      'laufs',
      'laund',
      'laura',
      'laval',
      'lavas',
      'laved',
      'laver',
      'laves',
      'lavra',
      'lavvy',
      'lawed',
      'lawer',
      'lawin',
      'lawks',
      'lawns',
      'lawny',
      'laxed',
      'laxer',
      'laxes',
      'laxly',
      'layed',
      'layin',
      'layup',
      'lazar',
      'lazed',
      'lazes',
      'lazos',
      'lazzi',
      'lazzo',
      'leads',
      'leady',
      'leafs',
      'leaks',
      'leams',
      'leans',
      'leany',
      'leaps',
      'leare',
      'lears',
      'leary',
      'leats',
      'leavy',
      'leaze',
      'leben',
      'leccy',
      'ledes',
      'ledgy',
      'ledum',
      'leear',
      'leeks',
      'leeps',
      'leers',
      'leese',
      'leets',
      'leeze',
      'lefte',
      'lefts',
      'leger',
      'leges',
      'legge',
      'leggo',
      'legit',
      'lehrs',
      'lehua',
      'leirs',
      'leish',
      'leman',
      'lemed',
      'lemel',
      'lemes',
      'lemma',
      'lemme',
      'lends',
      'lenes',
      'lengs',
      'lenis',
      'lenos',
      'lense',
      'lenti',
      'lento',
      'leone',
      'lepid',
      'lepra',
      'lepta',
      'lered',
      'leres',
      'lerps',
      'lesbo',
      'leses',
      'lests',
      'letch',
      'lethe',
      'letup',
      'leuch',
      'leuco',
      'leuds',
      'leugh',
      'levas',
      'levee',
      'leves',
      'levin',
      'levis',
      'lewis',
      'lexes',
      'lexis',
      'lezes',
      'lezza',
      'lezzy',
      'liana',
      'liane',
      'liang',
      'liard',
      'liars',
      'liart',
      'liber',
      'libra',
      'libri',
      'lichi',
      'licht',
      'licit',
      'licks',
      'lidar',
      'lidos',
      'liefs',
      'liens',
      'liers',
      'lieus',
      'lieve',
      'lifer',
      'lifes',
      'lifts',
      'ligan',
      'liger',
      'ligge',
      'ligne',
      'liked',
      'liker',
      'likes',
      'likin',
      'lills',
      'lilos',
      'lilts',
      'liman',
      'limas',
      'limax',
      'limba',
      'limbi',
      'limbs',
      'limby',
      'limed',
      'limen',
      'limes',
      'limey',
      'limma',
      'limns',
      'limos',
      'limpa',
      'limps',
      'linac',
      'linch',
      'linds',
      'lindy',
      'lined',
      'lines',
      'liney',
      'linga',
      'lings',
      'lingy',
      'linin',
      'links',
      'linky',
      'linns',
      'linny',
      'linos',
      'lints',
      'linty',
      'linum',
      'linux',
      'lions',
      'lipas',
      'lipes',
      'lipin',
      'lipos',
      'lippy',
      'liras',
      'lirks',
      'lirot',
      'lisks',
      'lisle',
      'lisps',
      'lists',
      'litai',
      'litas',
      'lited',
      'liter',
      'lites',
      'litho',
      'liths',
      'litre',
      'lived',
      'liven',
      'lives',
      'livor',
      'livre',
      'llano',
      'loach',
      'loads',
      'loafs',
      'loams',
      'loans',
      'loast',
      'loave',
      'lobar',
      'lobed',
      'lobes',
      'lobos',
      'lobus',
      'loche',
      'lochs',
      'locie',
      'locis',
      'locks',
      'locos',
      'locum',
      'loden',
      'lodes',
      'loess',
      'lofts',
      'logan',
      'loges',
      'loggy',
      'logia',
      'logie',
      'logoi',
      'logon',
      'logos',
      'lohan',
      'loids',
      'loins',
      'loipe',
      'loirs',
      'lokes',
      'lolls',
      'lolly',
      'lolog',
      'lomas',
      'lomed',
      'lomes',
      'loner',
      'longa',
      'longe',
      'longs',
      'looby',
      'looed',
      'looey',
      'loofa',
      'loofs',
      'looie',
      'looks',
      'looky',
      'looms',
      'loons',
      'loony',
      'loops',
      'loord',
      'loots',
      'loped',
      'loper',
      'lopes',
      'loppy',
      'loral',
      'loran',
      'lords',
      'lordy',
      'lorel',
      'lores',
      'loric',
      'loris',
      'losed',
      'losel',
      'losen',
      'loses',
      'lossy',
      'lotah',
      'lotas',
      'lotes',
      'lotic',
      'lotos',
      'lotsa',
      'lotta',
      'lotte',
      'lotto',
      'lotus',
      'loued',
      'lough',
      'louie',
      'louis',
      'louma',
      'lound',
      'louns',
      'loupe',
      'loups',
      'loure',
      'lours',
      'loury',
      'louts',
      'lovat',
      'loved',
      'loves',
      'lovey',
      'lovie',
      'lowan',
      'lowed',
      'lowes',
      'lownd',
      'lowne',
      'lowns',
      'lowps',
      'lowry',
      'lowse',
      'lowts',
      'loxed',
      'loxes',
      'lozen',
      'luach',
      'luaus',
      'lubed',
      'lubes',
      'lubra',
      'luces',
      'lucks',
      'lucre',
      'ludes',
      'ludic',
      'ludos',
      'luffa',
      'luffs',
      'luged',
      'luger',
      'luges',
      'lulls',
      'lulus',
      'lumas',
      'lumbi',
      'lumme',
      'lummy',
      'lumps',
      'lunas',
      'lunes',
      'lunet',
      'lungi',
      'lungs',
      'lunks',
      'lunts',
      'lupin',
      'lured',
      'lurer',
      'lures',
      'lurex',
      'lurgi',
      'lurgy',
      'lurks',
      'lurry',
      'lurve',
      'luser',
      'lushy',
      'lusks',
      'lusts',
      'lusus',
      'lutea',
      'luted',
      'luter',
      'lutes',
      'luvvy',
      'luxed',
      'luxer',
      'luxes',
      'lweis',
      'lyams',
      'lyard',
      'lyart',
      'lyase',
      'lycea',
      'lycee',
      'lycra',
      'lymes',
      'lynes',
      'lyres',
      'lysed',
      'lyses',
      'lysin',
      'lysis',
      'lysol',
      'lyssa',
      'lyted',
      'lytes',
      'lythe',
      'lytic',
      'lytta',
      'maaed',
      'maare',
      'maars',
      'mabes',
      'macas',
      'maced',
      'macer',
      'maces',
      'mache',
      'machi',
      'machs',
      'macks',
      'macle',
      'macon',
      'madge',
      'madid',
      'madre',
      'maerl',
      'mafic',
      'mages',
      'maggs',
      'magot',
      'magus',
      'mahoe',
      'mahua',
      'mahwa',
      'maids',
      'maiko',
      'maiks',
      'maile',
      'maill',
      'mails',
      'maims',
      'mains',
      'maire',
      'mairs',
      'maise',
      'maist',
      'makar',
      'makes',
      'makis',
      'makos',
      'malam',
      'malar',
      'malas',
      'malax',
      'males',
      'malic',
      'malik',
      'malis',
      'malls',
      'malms',
      'malmy',
      'malts',
      'malty',
      'malus',
      'malva',
      'malwa',
      'mamas',
      'mamba',
      'mamee',
      'mamey',
      'mamie',
      'manas',
      'manat',
      'mandi',
      'maneb',
      'maned',
      'maneh',
      'manes',
      'manet',
      'mangs',
      'manis',
      'manky',
      'manna',
      'manos',
      'manse',
      'manta',
      'manto',
      'manty',
      'manul',
      'manus',
      'mapau',
      'maqui',
      'marae',
      'marah',
      'maras',
      'marcs',
      'mardy',
      'mares',
      'marge',
      'margs',
      'maria',
      'marid',
      'marka',
      'marks',
      'marle',
      'marls',
      'marly',
      'marms',
      'maron',
      'maror',
      'marra',
      'marri',
      'marse',
      'marts',
      'marvy',
      'masas',
      'mased',
      'maser',
      'mases',
      'mashy',
      'masks',
      'massa',
      'massy',
      'masts',
      'masty',
      'masus',
      'matai',
      'mated',
      'mater',
      'mates',
      'maths',
      'matin',
      'matlo',
      'matte',
      'matts',
      'matza',
      'matzo',
      'mauby',
      'mauds',
      'mauls',
      'maund',
      'mauri',
      'mausy',
      'mauts',
      'mauzy',
      'maven',
      'mavie',
      'mavin',
      'mavis',
      'mawed',
      'mawks',
      'mawky',
      'mawns',
      'mawrs',
      'maxed',
      'maxes',
      'maxis',
      'mayan',
      'mayas',
      'mayed',
      'mayos',
      'mayst',
      'mazed',
      'mazer',
      'mazes',
      'mazey',
      'mazut',
      'mbira',
      'meads',
      'meals',
      'meane',
      'means',
      'meany',
      'meare',
      'mease',
      'meath',
      'meats',
      'mebos',
      'mechs',
      'mecks',
      'medii',
      'medle',
      'meeds',
      'meers',
      'meets',
      'meffs',
      'meins',
      'meint',
      'meiny',
      'meith',
      'mekka',
      'melas',
      'melba',
      'melds',
      'melic',
      'melik',
      'mells',
      'melts',
      'melty',
      'memes',
      'memos',
      'menad',
      'mends',
      'mened',
      'menes',
      'menge',
      'mengs',
      'mensa',
      'mense',
      'mensh',
      'menta',
      'mento',
      'menus',
      'meous',
      'meows',
      'merch',
      'mercs',
      'merde',
      'mered',
      'merel',
      'merer',
      'meres',
      'meril',
      'meris',
      'merks',
      'merle',
      'merls',
      'merse',
      'mesal',
      'mesas',
      'mesel',
      'meses',
      'meshy',
      'mesic',
      'mesne',
      'meson',
      'messy',
      'mesto',
      'meted',
      'metes',
      'metho',
      'meths',
      'metic',
      'metif',
      'metis',
      'metol',
      'metre',
      'meuse',
      'meved',
      'meves',
      'mewed',
      'mewls',
      'meynt',
      'mezes',
      'mezze',
      'mezzo',
      'mhorr',
      'miaou',
      'miaow',
      'miasm',
      'miaul',
      'micas',
      'miche',
      'micht',
      'micks',
      'micky',
      'micos',
      'micra',
      'middy',
      'midgy',
      'midis',
      'miens',
      'mieve',
      'miffs',
      'miffy',
      'mifty',
      'miggs',
      'mihas',
      'mihis',
      'miked',
      'mikes',
      'mikra',
      'mikva',
      'milch',
      'milds',
      'miler',
      'miles',
      'milfs',
      'milia',
      'milko',
      'milks',
      'mille',
      'mills',
      'milor',
      'milos',
      'milpa',
      'milts',
      'milty',
      'miltz',
      'mimed',
      'mimeo',
      'mimer',
      'mimes',
      'mimsy',
      'minae',
      'minar',
      'minas',
      'mincy',
      'minds',
      'mined',
      'mines',
      'minge',
      'mings',
      'mingy',
      'minis',
      'minke',
      'minks',
      'minny',
      'minos',
      'mints',
      'mired',
      'mires',
      'mirex',
      'mirid',
      'mirin',
      'mirks',
      'mirky',
      'mirly',
      'miros',
      'mirvs',
      'mirza',
      'misch',
      'misdo',
      'mises',
      'misgo',
      'misos',
      'missa',
      'mists',
      'misty',
      'mitch',
      'miter',
      'mites',
      'mitis',
      'mitre',
      'mitts',
      'mixed',
      'mixen',
      'mixer',
      'mixes',
      'mixte',
      'mixup',
      'mizen',
      'mizzy',
      'mneme',
      'moans',
      'moats',
      'mobby',
      'mobes',
      'mobey',
      'mobie',
      'moble',
      'mochi',
      'mochs',
      'mochy',
      'mocks',
      'moder',
      'modes',
      'modge',
      'modii',
      'modus',
      'moers',
      'mofos',
      'moggy',
      'mohel',
      'mohos',
      'mohrs',
      'mohua',
      'mohur',
      'moile',
      'moils',
      'moira',
      'moire',
      'moits',
      'mojos',
      'mokes',
      'mokis',
      'mokos',
      'molal',
      'molas',
      'molds',
      'moled',
      'moles',
      'molla',
      'molls',
      'molly',
      'molto',
      'molts',
      'molys',
      'momes',
      'momma',
      'mommy',
      'momus',
      'monad',
      'monal',
      'monas',
      'monde',
      'mondo',
      'moner',
      'mongo',
      'mongs',
      'monic',
      'monie',
      'monks',
      'monos',
      'monte',
      'monty',
      'moobs',
      'mooch',
      'moods',
      'mooed',
      'mooks',
      'moola',
      'mooli',
      'mools',
      'mooly',
      'moong',
      'moons',
      'moony',
      'moops',
      'moors',
      'moory',
      'moots',
      'moove',
      'moped',
      'moper',
      'mopes',
      'mopey',
      'moppy',
      'mopsy',
      'mopus',
      'morae',
      'moras',
      'morat',
      'moray',
      'morel',
      'mores',
      'moria',
      'morne',
      'morns',
      'morra',
      'morro',
      'morse',
      'morts',
      'mosed',
      'moses',
      'mosey',
      'mosks',
      'mosso',
      'moste',
      'mosts',
      'moted',
      'moten',
      'motes',
      'motet',
      'motey',
      'moths',
      'mothy',
      'motis',
      'motte',
      'motts',
      'motty',
      'motus',
      'motza',
      'mouch',
      'moues',
      'mould',
      'mouls',
      'moups',
      'moust',
      'mousy',
      'moved',
      'moves',
      'mowas',
      'mowed',
      'mowra',
      'moxas',
      'moxie',
      'moyas',
      'moyle',
      'moyls',
      'mozed',
      'mozes',
      'mozos',
      'mpret',
      'mucho',
      'mucic',
      'mucid',
      'mucin',
      'mucks',
      'mucor',
      'mucro',
      'mudge',
      'mudir',
      'mudra',
      'muffs',
      'mufti',
      'mugga',
      'muggs',
      'muggy',
      'muhly',
      'muids',
      'muils',
      'muirs',
      'muist',
      'mujik',
      'mulct',
      'muled',
      'mules',
      'muley',
      'mulga',
      'mulie',
      'mulla',
      'mulls',
      'mulse',
      'mulsh',
      'mumms',
      'mumps',
      'mumsy',
      'mumus',
      'munga',
      'munge',
      'mungo',
      'mungs',
      'munis',
      'munts',
      'muntu',
      'muons',
      'muras',
      'mured',
      'mures',
      'murex',
      'murid',
      'murks',
      'murls',
      'murly',
      'murra',
      'murre',
      'murri',
      'murrs',
      'murry',
      'murti',
      'murva',
      'musar',
      'musca',
      'mused',
      'muser',
      'muses',
      'muset',
      'musha',
      'musit',
      'musks',
      'musos',
      'musse',
      'mussy',
      'musth',
      'musts',
      'mutch',
      'muted',
      'muter',
      'mutes',
      'mutha',
      'mutis',
      'muton',
      'mutts',
      'muxed',
      'muxes',
      'muzak',
      'muzzy',
      'mvule',
      'myall',
      'mylar',
      'mynah',
      'mynas',
      'myoid',
      'myoma',
      'myope',
      'myops',
      'myopy',
      'mysid',
      'mythi',
      'myths',
      'mythy',
      'myxos',
      'mzees',
      'naams',
      'naans',
      'nabes',
      'nabis',
      'nabks',
      'nabla',
      'nabob',
      'nache',
      'nacho',
      'nacre',
      'nadas',
      'naeve',
      'naevi',
      'naffs',
      'nagas',
      'naggy',
      'nagor',
      'nahal',
      'naiad',
      'naifs',
      'naiks',
      'nails',
      'naira',
      'nairu',
      'naked',
      'naker',
      'nakfa',
      'nalas',
      'naled',
      'nalla',
      'named',
      'namer',
      'names',
      'namma',
      'namus',
      'nanas',
      'nance',
      'nancy',
      'nandu',
      'nanna',
      'nanos',
      'nanua',
      'napas',
      'naped',
      'napes',
      'napoo',
      'nappa',
      'nappe',
      'nappy',
      'naras',
      'narco',
      'narcs',
      'nards',
      'nares',
      'naric',
      'naris',
      'narks',
      'narky',
      'narre',
      'nashi',
      'natch',
      'nates',
      'natis',
      'natty',
      'nauch',
      'naunt',
      'navar',
      'naves',
      'navew',
      'navvy',
      'nawab',
      'nazes',
      'nazir',
      'nazis',
      'nduja',
      'neafe',
      'neals',
      'neaps',
      'nears',
      'neath',
      'neats',
      'nebek',
      'nebel',
      'necks',
      'neddy',
      'needs',
      'neeld',
      'neele',
      'neemb',
      'neems',
      'neeps',
      'neese',
      'neeze',
      'negro',
      'negus',
      'neifs',
      'neist',
      'neive',
      'nelis',
      'nelly',
      'nemas',
      'nemns',
      'nempt',
      'nenes',
      'neons',
      'neper',
      'nepit',
      'neral',
      'nerds',
      'nerka',
      'nerks',
      'nerol',
      'nerts',
      'nertz',
      'nervy',
      'nests',
      'netes',
      'netop',
      'netts',
      'netty',
      'neuks',
      'neume',
      'neums',
      'nevel',
      'neves',
      'nevus',
      'newbs',
      'newed',
      'newel',
      'newie',
      'newsy',
      'newts',
      'nexts',
      'nexus',
      'ngaio',
      'ngana',
      'ngati',
      'ngoma',
      'ngwee',
      'nicad',
      'nicht',
      'nicks',
      'nicol',
      'nidal',
      'nided',
      'nides',
      'nidor',
      'nidus',
      'niefs',
      'nieve',
      'nifes',
      'niffs',
      'niffy',
      'nifty',
      'niger',
      'nighs',
      'nihil',
      'nikab',
      'nikah',
      'nikau',
      'nills',
      'nimbi',
      'nimbs',
      'nimps',
      'niner',
      'nines',
      'ninon',
      'nipas',
      'nippy',
      'niqab',
      'nirls',
      'nirly',
      'nisei',
      'nisse',
      'nisus',
      'niter',
      'nites',
      'nitid',
      'niton',
      'nitre',
      'nitro',
      'nitry',
      'nitty',
      'nival',
      'nixed',
      'nixer',
      'nixes',
      'nixie',
      'nizam',
      'nkosi',
      'noahs',
      'nobby',
      'nocks',
      'nodal',
      'noddy',
      'nodes',
      'nodus',
      'noels',
      'noggs',
      'nohow',
      'noils',
      'noily',
      'noint',
      'noirs',
      'noles',
      'nolls',
      'nolos',
      'nomas',
      'nomen',
      'nomes',
      'nomic',
      'nomoi',
      'nomos',
      'nonas',
      'nonce',
      'nones',
      'nonet',
      'nongs',
      'nonis',
      'nonny',
      'nonyl',
      'noobs',
      'nooit',
      'nooks',
      'nooky',
      'noons',
      'noops',
      'nopal',
      'noria',
      'noris',
      'norks',
      'norma',
      'norms',
      'nosed',
      'noser',
      'noses',
      'notal',
      'noted',
      'noter',
      'notes',
      'notum',
      'nould',
      'noule',
      'nouls',
      'nouns',
      'nouny',
      'noups',
      'novae',
      'novas',
      'novum',
      'noway',
      'nowed',
      'nowls',
      'nowts',
      'nowty',
      'noxal',
      'noxes',
      'noyau',
      'noyed',
      'noyes',
      'nubby',
      'nubia',
      'nucha',
      'nuddy',
      'nuder',
      'nudes',
      'nudie',
      'nudzh',
      'nuffs',
      'nugae',
      'nuked',
      'nukes',
      'nulla',
      'nulls',
      'numbs',
      'numen',
      'nummy',
      'nunny',
      'nurds',
      'nurdy',
      'nurls',
      'nurrs',
      'nutso',
      'nutsy',
      'nyaff',
      'nyala',
      'nying',
      'nyssa',
      'oaked',
      'oaker',
      'oakum',
      'oared',
      'oases',
      'oasis',
      'oasts',
      'oaten',
      'oater',
      'oaths',
      'oaves',
      'obang',
      'obeah',
      'obeli',
      'obeys',
      'obias',
      'obied',
      'obiit',
      'obits',
      'objet',
      'oboes',
      'obole',
      'oboli',
      'obols',
      'occam',
      'ocher',
      'oches',
      'ochre',
      'ochry',
      'ocker',
      'ocrea',
      'octad',
      'octan',
      'octas',
      'octyl',
      'oculi',
      'odahs',
      'odals',
      'odeon',
      'odeum',
      'odism',
      'odist',
      'odium',
      'odors',
      'odour',
      'odyle',
      'odyls',
      'ofays',
      'offed',
      'offie',
      'oflag',
      'ofter',
      'ogams',
      'ogeed',
      'ogees',
      'oggin',
      'ogham',
      'ogive',
      'ogled',
      'ogler',
      'ogles',
      'ogmic',
      'ogres',
      'ohias',
      'ohing',
      'ohmic',
      'ohone',
      'oidia',
      'oiled',
      'oiler',
      'oinks',
      'oints',
      'ojime',
      'okapi',
      'okays',
      'okehs',
      'okras',
      'oktas',
      'oldie',
      'oleic',
      'olein',
      'olent',
      'oleos',
      'oleum',
      'olios',
      'ollas',
      'ollav',
      'oller',
      'ollie',
      'ology',
      'olpae',
      'olpes',
      'omasa',
      'omber',
      'ombus',
      'omens',
      'omers',
      'omits',
      'omlah',
      'omovs',
      'omrah',
      'oncer',
      'onces',
      'oncet',
      'oncus',
      'onely',
      'oners',
      'onery',
      'onium',
      'onkus',
      'onlay',
      'onned',
      'ontic',
      'oobit',
      'oohed',
      'oomph',
      'oonts',
      'ooped',
      'oorie',
      'ooses',
      'ootid',
      'oozed',
      'oozes',
      'opahs',
      'opals',
      'opens',
      'opepe',
      'oping',
      'oppos',
      'opsin',
      'opted',
      'opter',
      'orach',
      'oracy',
      'orals',
      'orang',
      'orant',
      'orate',
      'orbed',
      'orcas',
      'orcin',
      'ordos',
      'oread',
      'orfes',
      'orgia',
      'orgic',
      'orgue',
      'oribi',
      'oriel',
      'orixa',
      'orles',
      'orlon',
      'orlop',
      'ormer',
      'ornis',
      'orpin',
      'orris',
      'ortho',
      'orval',
      'orzos',
      'oscar',
      'oshac',
      'osier',
      'osmic',
      'osmol',
      'ossia',
      'ostia',
      'otaku',
      'otary',
      'ottar',
      'ottos',
      'oubit',
      'oucht',
      'ouens',
      'ouija',
      'oulks',
      'oumas',
      'oundy',
      'oupas',
      'ouped',
      'ouphe',
      'ouphs',
      'ourie',
      'ousel',
      'ousts',
      'outby',
      'outed',
      'outre',
      'outro',
      'outta',
      'ouzel',
      'ouzos',
      'ovals',
      'ovels',
      'ovens',
      'overs',
      'ovist',
      'ovoli',
      'ovolo',
      'ovule',
      'owche',
      'owies',
      'owled',
      'owler',
      'owlet',
      'owned',
      'owres',
      'owrie',
      'owsen',
      'oxbow',
      'oxers',
      'oxeye',
      'oxids',
      'oxies',
      'oxime',
      'oxims',
      'oxlip',
      'oxter',
      'oyers',
      'ozeki',
      'ozzie',
      'paals',
      'paans',
      'pacas',
      'paced',
      'pacer',
      'paces',
      'pacey',
      'pacha',
      'packs',
      'pacos',
      'pacta',
      'pacts',
      'padis',
      'padle',
      'padma',
      'padre',
      'padri',
      'paean',
      'paedo',
      'paeon',
      'paged',
      'pager',
      'pages',
      'pagle',
      'pagod',
      'pagri',
      'paiks',
      'pails',
      'pains',
      'paire',
      'pairs',
      'paisa',
      'paise',
      'pakka',
      'palas',
      'palay',
      'palea',
      'paled',
      'pales',
      'palet',
      'palis',
      'palki',
      'palla',
      'palls',
      'pally',
      'palms',
      'palmy',
      'palpi',
      'palps',
      'palsa',
      'pampa',
      'panax',
      'pance',
      'panda',
      'pands',
      'pandy',
      'paned',
      'panes',
      'panga',
      'pangs',
      'panim',
      'panko',
      'panne',
      'panni',
      'panto',
      'pants',
      'panty',
      'paoli',
      'paolo',
      'papas',
      'papaw',
      'papes',
      'pappi',
      'pappy',
      'parae',
      'paras',
      'parch',
      'pardi',
      'pards',
      'pardy',
      'pared',
      'paren',
      'pareo',
      'pares',
      'pareu',
      'parev',
      'parge',
      'pargo',
      'paris',
      'parki',
      'parks',
      'parky',
      'parle',
      'parly',
      'parma',
      'parol',
      'parps',
      'parra',
      'parrs',
      'parti',
      'parts',
      'parve',
      'parvo',
      'paseo',
      'pases',
      'pasha',
      'pashm',
      'paska',
      'paspy',
      'passe',
      'pasts',
      'pated',
      'paten',
      'pater',
      'pates',
      'paths',
      'patin',
      'patka',
      'patly',
      'patte',
      'patus',
      'pauas',
      'pauls',
      'pavan',
      'paved',
      'paven',
      'paver',
      'paves',
      'pavid',
      'pavin',
      'pavis',
      'pawas',
      'pawaw',
      'pawed',
      'pawer',
      'pawks',
      'pawky',
      'pawls',
      'pawns',
      'paxes',
      'payed',
      'payor',
      'paysd',
      'peage',
      'peags',
      'peaks',
      'peaky',
      'peals',
      'peans',
      'peare',
      'pears',
      'peart',
      'pease',
      'peats',
      'peaty',
      'peavy',
      'peaze',
      'pebas',
      'pechs',
      'pecke',
      'pecks',
      'pecky',
      'pedes',
      'pedis',
      'pedro',
      'peece',
      'peeks',
      'peels',
      'peens',
      'peeoy',
      'peepe',
      'peeps',
      'peers',
      'peery',
      'peeve',
      'peggy',
      'peghs',
      'peins',
      'peise',
      'peize',
      'pekan',
      'pekes',
      'pekin',
      'pekoe',
      'pelas',
      'pelau',
      'peles',
      'pelfs',
      'pells',
      'pelma',
      'pelon',
      'pelta',
      'pelts',
      'pends',
      'pendu',
      'pened',
      'penes',
      'pengo',
      'penie',
      'penis',
      'penks',
      'penna',
      'penni',
      'pents',
      'peons',
      'peony',
      'pepla',
      'pepos',
      'peppy',
      'pepsi',
      'perai',
      'perce',
      'percs',
      'perdu',
      'perdy',
      'perea',
      'peres',
      'peris',
      'perks',
      'perms',
      'perns',
      'perog',
      'perps',
      'perry',
      'perse',
      'perst',
      'perts',
      'perve',
      'pervo',
      'pervs',
      'pervy',
      'pesos',
      'pests',
      'pesty',
      'petar',
      'peter',
      'petit',
      'petre',
      'petri',
      'petti',
      'petto',
      'pewee',
      'pewit',
      'peyse',
      'phage',
      'phang',
      'phare',
      'pharm',
      'pheer',
      'phene',
      'pheon',
      'phese',
      'phial',
      'phish',
      'phizz',
      'phlox',
      'phoca',
      'phono',
      'phons',
      'phots',
      'phpht',
      'phuts',
      'phyla',
      'phyle',
      'piani',
      'pians',
      'pibal',
      'pical',
      'picas',
      'piccy',
      'picks',
      'picot',
      'picra',
      'picul',
      'piend',
      'piers',
      'piert',
      'pieta',
      'piets',
      'piezo',
      'pight',
      'pigmy',
      'piing',
      'pikas',
      'pikau',
      'piked',
      'piker',
      'pikes',
      'pikey',
      'pikis',
      'pikul',
      'pilae',
      'pilaf',
      'pilao',
      'pilar',
      'pilau',
      'pilaw',
      'pilch',
      'pilea',
      'piled',
      'pilei',
      'piler',
      'piles',
      'pilis',
      'pills',
      'pilow',
      'pilum',
      'pilus',
      'pimas',
      'pimps',
      'pinas',
      'pined',
      'pines',
      'pingo',
      'pings',
      'pinko',
      'pinks',
      'pinna',
      'pinny',
      'pinon',
      'pinot',
      'pinta',
      'pints',
      'pinup',
      'pions',
      'piony',
      'pious',
      'pioye',
      'pioys',
      'pipal',
      'pipas',
      'piped',
      'pipes',
      'pipet',
      'pipis',
      'pipit',
      'pippy',
      'pipul',
      'pirai',
      'pirls',
      'pirns',
      'pirog',
      'pisco',
      'pises',
      'pisky',
      'pisos',
      'pissy',
      'piste',
      'pitas',
      'piths',
      'piton',
      'pitot',
      'pitta',
      'piums',
      'pixes',
      'pized',
      'pizes',
      'plaas',
      'plack',
      'plage',
      'plans',
      'plaps',
      'plash',
      'plasm',
      'plast',
      'plats',
      'platt',
      'platy',
      'playa',
      'plays',
      'pleas',
      'plebe',
      'plebs',
      'plena',
      'pleon',
      'plesh',
      'plews',
      'plica',
      'plies',
      'plims',
      'pling',
      'plink',
      'ploat',
      'plods',
      'plong',
      'plonk',
      'plook',
      'plops',
      'plots',
      'plotz',
      'plouk',
      'plows',
      'ploye',
      'ploys',
      'plues',
      'pluff',
      'plugs',
      'plums',
      'plumy',
      'pluot',
      'pluto',
      'plyer',
      'poach',
      'poaka',
      'poake',
      'poboy',
      'pocks',
      'pocky',
      'podal',
      'poddy',
      'podex',
      'podge',
      'podgy',
      'podia',
      'poems',
      'poeps',
      'poets',
      'pogey',
      'pogge',
      'pogos',
      'pohed',
      'poilu',
      'poind',
      'pokal',
      'poked',
      'pokes',
      'pokey',
      'pokie',
      'poled',
      'poler',
      'poles',
      'poley',
      'polio',
      'polis',
      'polje',
      'polks',
      'polls',
      'polly',
      'polos',
      'polts',
      'polys',
      'pombe',
      'pomes',
      'pommy',
      'pomos',
      'pomps',
      'ponce',
      'poncy',
      'ponds',
      'pones',
      'poney',
      'ponga',
      'pongo',
      'pongs',
      'pongy',
      'ponks',
      'ponts',
      'ponty',
      'ponzu',
      'poods',
      'pooed',
      'poofs',
      'poofy',
      'poohs',
      'pooja',
      'pooka',
      'pooks',
      'pools',
      'poons',
      'poops',
      'poopy',
      'poori',
      'poort',
      'poots',
      'poove',
      'poovy',
      'popes',
      'poppa',
      'popsy',
      'porae',
      'poral',
      'pored',
      'porer',
      'pores',
      'porge',
      'porgy',
      'porin',
      'porks',
      'porky',
      'porno',
      'porns',
      'porny',
      'porta',
      'ports',
      'porty',
      'posed',
      'poses',
      'posey',
      'posho',
      'posts',
      'potae',
      'potch',
      'poted',
      'potes',
      'potin',
      'potoo',
      'potsy',
      'potto',
      'potts',
      'potty',
      'pouff',
      'poufs',
      'pouke',
      'pouks',
      'poule',
      'poulp',
      'poult',
      'poupe',
      'poupt',
      'pours',
      'pouts',
      'powan',
      'powin',
      'pownd',
      'powns',
      'powny',
      'powre',
      'poxed',
      'poxes',
      'poynt',
      'poyou',
      'poyse',
      'pozzy',
      'praam',
      'prads',
      'prahu',
      'prams',
      'prana',
      'prang',
      'praos',
      'prase',
      'prate',
      'prats',
      'pratt',
      'praty',
      'praus',
      'prays',
      'predy',
      'preed',
      'prees',
      'preif',
      'prems',
      'premy',
      'prent',
      'preon',
      'preop',
      'preps',
      'presa',
      'prese',
      'prest',
      'preve',
      'prexy',
      'preys',
      'prial',
      'pricy',
      'prief',
      'prier',
      'pries',
      'prigs',
      'prill',
      'prima',
      'primi',
      'primp',
      'prims',
      'primy',
      'prink',
      'prion',
      'prise',
      'priss',
      'proas',
      'probs',
      'prods',
      'proem',
      'profs',
      'progs',
      'proin',
      'proke',
      'prole',
      'proll',
      'promo',
      'proms',
      'pronk',
      'props',
      'prore',
      'proso',
      'pross',
      'prost',
      'prosy',
      'proto',
      'proul',
      'prows',
      'proyn',
      'prunt',
      'pruta',
      'pryer',
      'pryse',
      'pseud',
      'pshaw',
      'psion',
      'psoae',
      'psoai',
      'psoas',
      'psora',
      'psych',
      'psyop',
      'pubco',
      'pubes',
      'pubis',
      'pucan',
      'pucer',
      'puces',
      'pucka',
      'pucks',
      'puddy',
      'pudge',
      'pudic',
      'pudor',
      'pudsy',
      'pudus',
      'puers',
      'puffa',
      'puffs',
      'puggy',
      'pugil',
      'puhas',
      'pujah',
      'pujas',
      'pukas',
      'puked',
      'puker',
      'pukes',
      'pukey',
      'pukka',
      'pukus',
      'pulao',
      'pulas',
      'puled',
      'puler',
      'pules',
      'pulik',
      'pulis',
      'pulka',
      'pulks',
      'pulli',
      'pulls',
      'pully',
      'pulmo',
      'pulps',
      'pulus',
      'pumas',
      'pumie',
      'pumps',
      'punas',
      'punce',
      'punga',
      'pungs',
      'punji',
      'punka',
      'punks',
      'punky',
      'punny',
      'punto',
      'punts',
      'punty',
      'pupae',
      'pupas',
      'pupus',
      'purda',
      'pured',
      'pures',
      'purin',
      'puris',
      'purls',
      'purpy',
      'purrs',
      'pursy',
      'purty',
      'puses',
      'pusle',
      'pussy',
      'putid',
      'puton',
      'putti',
      'putto',
      'putts',
      'puzel',
      'pwned',
      'pyats',
      'pyets',
      'pygal',
      'pyins',
      'pylon',
      'pyned',
      'pynes',
      'pyoid',
      'pyots',
      'pyral',
      'pyran',
      'pyres',
      'pyrex',
      'pyric',
      'pyros',
      'pyxed',
      'pyxes',
      'pyxie',
      'pyxis',
      'pzazz',
      'qadis',
      'qaids',
      'qajaq',
      'qanat',
      'qapik',
      'qibla',
      'qophs',
      'qorma',
      'quads',
      'quaff',
      'quags',
      'quair',
      'quais',
      'quaky',
      'quale',
      'quant',
      'quare',
      'quass',
      'quate',
      'quats',
      'quayd',
      'quays',
      'qubit',
      'quean',
      'queme',
      'quena',
      'quern',
      'queyn',
      'queys',
      'quich',
      'quids',
      'quiff',
      'quims',
      'quina',
      'quine',
      'quino',
      'quins',
      'quint',
      'quipo',
      'quips',
      'quipu',
      'quire',
      'quirt',
      'quist',
      'quits',
      'quoad',
      'quods',
      'quoif',
      'quoin',
      'quoit',
      'quoll',
      'quonk',
      'quops',
      'qursh',
      'quyte',
      'rabat',
      'rabic',
      'rabis',
      'raced',
      'races',
      'rache',
      'racks',
      'racon',
      'radge',
      'radix',
      'radon',
      'raffs',
      'rafts',
      'ragas',
      'ragde',
      'raged',
      'ragee',
      'rager',
      'rages',
      'ragga',
      'raggs',
      'raggy',
      'ragis',
      'ragus',
      'rahed',
      'rahui',
      'raias',
      'raids',
      'raiks',
      'raile',
      'rails',
      'raine',
      'rains',
      'raird',
      'raita',
      'raits',
      'rajas',
      'rajes',
      'raked',
      'rakee',
      'raker',
      'rakes',
      'rakia',
      'rakis',
      'rakus',
      'rales',
      'ramal',
      'ramee',
      'ramet',
      'ramie',
      'ramin',
      'ramis',
      'rammy',
      'ramps',
      'ramus',
      'ranas',
      'rance',
      'rands',
      'ranee',
      'ranga',
      'rangi',
      'rangs',
      'rangy',
      'ranid',
      'ranis',
      'ranke',
      'ranks',
      'rants',
      'raped',
      'raper',
      'rapes',
      'raphe',
      'rappe',
      'rared',
      'raree',
      'rares',
      'rarks',
      'rased',
      'raser',
      'rases',
      'rasps',
      'rasse',
      'rasta',
      'ratal',
      'ratan',
      'ratas',
      'ratch',
      'rated',
      'ratel',
      'rater',
      'rates',
      'ratha',
      'rathe',
      'raths',
      'ratoo',
      'ratos',
      'ratus',
      'rauns',
      'raupo',
      'raved',
      'ravel',
      'raver',
      'raves',
      'ravey',
      'ravin',
      'rawer',
      'rawin',
      'rawly',
      'rawns',
      'raxed',
      'raxes',
      'rayah',
      'rayas',
      'rayed',
      'rayle',
      'rayne',
      'razed',
      'razee',
      'razer',
      'razes',
      'razoo',
      'readd',
      'reads',
      'reais',
      'reaks',
      'realo',
      'reals',
      'reame',
      'reams',
      'reamy',
      'reans',
      'reaps',
      'rears',
      'reast',
      'reata',
      'reate',
      'reave',
      'rebbe',
      'rebec',
      'rebid',
      'rebit',
      'rebop',
      'rebuy',
      'recal',
      'recce',
      'recco',
      'reccy',
      'recit',
      'recks',
      'recon',
      'recta',
      'recti',
      'recto',
      'redan',
      'redds',
      'reddy',
      'reded',
      'redes',
      'redia',
      'redid',
      'redip',
      'redly',
      'redon',
      'redos',
      'redox',
      'redry',
      'redub',
      'redux',
      'redye',
      'reech',
      'reede',
      'reeds',
      'reefs',
      'reefy',
      'reeks',
      'reeky',
      'reels',
      'reens',
      'reest',
      'reeve',
      'refed',
      'refel',
      'reffo',
      'refis',
      'refix',
      'refly',
      'refry',
      'regar',
      'reges',
      'reggo',
      'regie',
      'regma',
      'regna',
      'regos',
      'regur',
      'rehem',
      'reifs',
      'reify',
      'reiki',
      'reiks',
      'reink',
      'reins',
      'reird',
      'reist',
      'reive',
      'rejig',
      'rejon',
      'reked',
      'rekes',
      'rekey',
      'relet',
      'relie',
      'relit',
      'rello',
      'reman',
      'remap',
      'remen',
      'remet',
      'remex',
      'remix',
      'renay',
      'rends',
      'reney',
      'renga',
      'renig',
      'renin',
      'renne',
      'renos',
      'rente',
      'rents',
      'reoil',
      'reorg',
      'repeg',
      'repin',
      'repla',
      'repos',
      'repot',
      'repps',
      'repro',
      'reran',
      'rerig',
      'resat',
      'resaw',
      'resay',
      'resee',
      'reses',
      'resew',
      'resid',
      'resit',
      'resod',
      'resow',
      'resto',
      'rests',
      'resty',
      'resus',
      'retag',
      'retax',
      'retem',
      'retia',
      'retie',
      'retox',
      'revet',
      'revie',
      'rewan',
      'rewax',
      'rewed',
      'rewet',
      'rewin',
      'rewon',
      'rewth',
      'rexes',
      'rezes',
      'rheas',
      'rheme',
      'rheum',
      'rhies',
      'rhime',
      'rhine',
      'rhody',
      'rhomb',
      'rhone',
      'rhumb',
      'rhyne',
      'rhyta',
      'riads',
      'rials',
      'riant',
      'riata',
      'ribas',
      'ribby',
      'ribes',
      'riced',
      'ricer',
      'rices',
      'ricey',
      'richt',
      'ricin',
      'ricks',
      'rides',
      'ridgy',
      'ridic',
      'riels',
      'riems',
      'rieve',
      'rifer',
      'riffs',
      'rifte',
      'rifts',
      'rifty',
      'riggs',
      'rigol',
      'riled',
      'riles',
      'riley',
      'rille',
      'rills',
      'rimae',
      'rimed',
      'rimer',
      'rimes',
      'rimus',
      'rinds',
      'rindy',
      'rines',
      'rings',
      'rinks',
      'rioja',
      'riots',
      'riped',
      'ripes',
      'ripps',
      'rises',
      'rishi',
      'risks',
      'risps',
      'risus',
      'rites',
      'ritts',
      'ritzy',
      'rivas',
      'rived',
      'rivel',
      'riven',
      'rives',
      'riyal',
      'rizas',
      'roads',
      'roams',
      'roans',
      'roars',
      'roary',
      'roate',
      'robed',
      'robes',
      'roble',
      'rocks',
      'roded',
      'rodes',
      'roguy',
      'rohes',
      'roids',
      'roils',
      'roily',
      'roins',
      'roist',
      'rojak',
      'rojis',
      'roked',
      'roker',
      'rokes',
      'rolag',
      'roles',
      'rolfs',
      'rolls',
      'romal',
      'roman',
      'romeo',
      'romps',
      'ronde',
      'rondo',
      'roneo',
      'rones',
      'ronin',
      'ronne',
      'ronte',
      'ronts',
      'roods',
      'roofs',
      'roofy',
      'rooks',
      'rooky',
      'rooms',
      'roons',
      'roops',
      'roopy',
      'roosa',
      'roose',
      'roots',
      'rooty',
      'roped',
      'roper',
      'ropes',
      'ropey',
      'roque',
      'roral',
      'rores',
      'roric',
      'rorid',
      'rorie',
      'rorts',
      'rorty',
      'rosed',
      'roses',
      'roset',
      'roshi',
      'rosin',
      'rosit',
      'rosti',
      'rosts',
      'rotal',
      'rotan',
      'rotas',
      'rotch',
      'roted',
      'rotes',
      'rotis',
      'rotls',
      'roton',
      'rotos',
      'rotte',
      'rouen',
      'roues',
      'roule',
      'rouls',
      'roums',
      'roups',
      'roupy',
      'roust',
      'routh',
      'routs',
      'roved',
      'roven',
      'roves',
      'rowan',
      'rowed',
      'rowel',
      'rowen',
      'rowie',
      'rowme',
      'rownd',
      'rowth',
      'rowts',
      'royne',
      'royst',
      'rozet',
      'rozit',
      'ruana',
      'rubai',
      'rubby',
      'rubel',
      'rubes',
      'rubin',
      'ruble',
      'rubli',
      'rubus',
      'ruche',
      'rucks',
      'rudas',
      'rudds',
      'rudes',
      'rudie',
      'rudis',
      'rueda',
      'ruers',
      'ruffe',
      'ruffs',
      'rugae',
      'rugal',
      'ruggy',
      'ruing',
      'ruins',
      'rukhs',
      'ruled',
      'rules',
      'rumal',
      'rumbo',
      'rumen',
      'rumes',
      'rumly',
      'rummy',
      'rumpo',
      'rumps',
      'rumpy',
      'runch',
      'runds',
      'runed',
      'runes',
      'rungs',
      'runic',
      'runny',
      'runts',
      'runty',
      'rupia',
      'rurps',
      'rurus',
      'rusas',
      'ruses',
      'rushy',
      'rusks',
      'rusma',
      'russe',
      'rusts',
      'ruths',
      'rutin',
      'rutty',
      'ryals',
      'rybat',
      'ryked',
      'rykes',
      'rymme',
      'rynds',
      'ryots',
      'ryper',
      'saags',
      'sabal',
      'sabed',
      'saber',
      'sabes',
      'sabha',
      'sabin',
      'sabir',
      'sable',
      'sabot',
      'sabra',
      'sabre',
      'sacks',
      'sacra',
      'saddo',
      'sades',
      'sadhe',
      'sadhu',
      'sadis',
      'sados',
      'sadza',
      'safed',
      'safes',
      'sagas',
      'sager',
      'sages',
      'saggy',
      'sagos',
      'sagum',
      'saheb',
      'sahib',
      'saice',
      'saick',
      'saics',
      'saids',
      'saiga',
      'sails',
      'saims',
      'saine',
      'sains',
      'sairs',
      'saist',
      'saith',
      'sajou',
      'sakai',
      'saker',
      'sakes',
      'sakia',
      'sakis',
      'sakti',
      'salal',
      'salat',
      'salep',
      'sales',
      'salet',
      'salic',
      'salix',
      'salle',
      'salmi',
      'salol',
      'salop',
      'salpa',
      'salps',
      'salse',
      'salto',
      'salts',
      'salue',
      'salut',
      'saman',
      'samas',
      'samba',
      'sambo',
      'samek',
      'samel',
      'samen',
      'sames',
      'samey',
      'samfu',
      'sammy',
      'sampi',
      'samps',
      'sands',
      'saned',
      'sanes',
      'sanga',
      'sangh',
      'sango',
      'sangs',
      'sanko',
      'sansa',
      'santo',
      'sants',
      'saola',
      'sapan',
      'sapid',
      'sapor',
      'saran',
      'sards',
      'sared',
      'saree',
      'sarge',
      'sargo',
      'sarin',
      'saris',
      'sarks',
      'sarky',
      'sarod',
      'saros',
      'sarus',
      'saser',
      'sasin',
      'sasse',
      'satai',
      'satay',
      'sated',
      'satem',
      'sates',
      'satis',
      'sauba',
      'sauch',
      'saugh',
      'sauls',
      'sault',
      'saunt',
      'saury',
      'sauts',
      'saved',
      'saver',
      'saves',
      'savey',
      'savin',
      'sawah',
      'sawed',
      'sawer',
      'saxes',
      'sayed',
      'sayer',
      'sayid',
      'sayne',
      'sayon',
      'sayst',
      'sazes',
      'scabs',
      'scads',
      'scaff',
      'scags',
      'scail',
      'scala',
      'scall',
      'scams',
      'scand',
      'scans',
      'scapa',
      'scape',
      'scapi',
      'scarp',
      'scars',
      'scart',
      'scath',
      'scats',
      'scatt',
      'scaud',
      'scaup',
      'scaur',
      'scaws',
      'sceat',
      'scena',
      'scend',
      'schav',
      'schmo',
      'schul',
      'schwa',
      'sclim',
      'scody',
      'scogs',
      'scoog',
      'scoot',
      'scopa',
      'scops',
      'scots',
      'scoug',
      'scoup',
      'scowp',
      'scows',
      'scrab',
      'scrae',
      'scrag',
      'scran',
      'scrat',
      'scraw',
      'scray',
      'scrim',
      'scrip',
      'scrob',
      'scrod',
      'scrog',
      'scrow',
      'scudi',
      'scudo',
      'scuds',
      'scuff',
      'scuft',
      'scugs',
      'sculk',
      'scull',
      'sculp',
      'sculs',
      'scums',
      'scups',
      'scurf',
      'scurs',
      'scuse',
      'scuta',
      'scute',
      'scuts',
      'scuzz',
      'scyes',
      'sdayn',
      'sdein',
      'seals',
      'seame',
      'seams',
      'seamy',
      'seans',
      'seare',
      'sears',
      'sease',
      'seats',
      'seaze',
      'sebum',
      'secco',
      'sechs',
      'sects',
      'seder',
      'sedes',
      'sedge',
      'sedgy',
      'sedum',
      'seeds',
      'seeks',
      'seeld',
      'seels',
      'seely',
      'seems',
      'seeps',
      'seepy',
      'seers',
      'sefer',
      'segar',
      'segni',
      'segno',
      'segol',
      'segos',
      'sehri',
      'seifs',
      'seils',
      'seine',
      'seirs',
      'seise',
      'seism',
      'seity',
      'seiza',
      'sekos',
      'sekts',
      'selah',
      'seles',
      'selfs',
      'sella',
      'selle',
      'sells',
      'selva',
      'semee',
      'semes',
      'semie',
      'semis',
      'senas',
      'sends',
      'senes',
      'sengi',
      'senna',
      'senor',
      'sensa',
      'sensi',
      'sente',
      'senti',
      'sents',
      'senvy',
      'senza',
      'sepad',
      'sepal',
      'sepic',
      'sepoy',
      'septa',
      'septs',
      'serac',
      'serai',
      'seral',
      'sered',
      'serer',
      'seres',
      'serfs',
      'serge',
      'seric',
      'serin',
      'serks',
      'seron',
      'serow',
      'serra',
      'serre',
      'serrs',
      'serry',
      'servo',
      'sesey',
      'sessa',
      'setae',
      'setal',
      'seton',
      'setts',
      'sewan',
      'sewar',
      'sewed',
      'sewel',
      'sewen',
      'sewin',
      'sexed',
      'sexer',
      'sexes',
      'sexto',
      'sexts',
      'seyen',
      'shads',
      'shags',
      'shahs',
      'shako',
      'shakt',
      'shalm',
      'shaly',
      'shama',
      'shams',
      'shand',
      'shans',
      'shaps',
      'sharn',
      'shash',
      'shaul',
      'shawm',
      'shawn',
      'shaws',
      'shaya',
      'shays',
      'shchi',
      'sheaf',
      'sheal',
      'sheas',
      'sheds',
      'sheel',
      'shend',
      'shent',
      'sheol',
      'sherd',
      'shere',
      'shero',
      'shets',
      'sheva',
      'shewn',
      'shews',
      'shiai',
      'shiel',
      'shier',
      'shies',
      'shill',
      'shily',
      'shims',
      'shins',
      'ships',
      'shirr',
      'shirs',
      'shish',
      'shiso',
      'shist',
      'shite',
      'shits',
      'shiur',
      'shiva',
      'shive',
      'shivs',
      'shlep',
      'shlub',
      'shmek',
      'shmoe',
      'shoat',
      'shoed',
      'shoer',
      'shoes',
      'shogi',
      'shogs',
      'shoji',
      'shojo',
      'shola',
      'shool',
      'shoon',
      'shoos',
      'shope',
      'shops',
      'shorl',
      'shote',
      'shots',
      'shott',
      'showd',
      'shows',
      'shoyu',
      'shred',
      'shris',
      'shrow',
      'shtik',
      'shtum',
      'shtup',
      'shule',
      'shuln',
      'shuls',
      'shuns',
      'shura',
      'shute',
      'shuts',
      'shwas',
      'shyer',
      'sials',
      'sibbs',
      'sibyl',
      'sices',
      'sicht',
      'sicko',
      'sicks',
      'sicky',
      'sidas',
      'sided',
      'sider',
      'sides',
      'sidha',
      'sidhe',
      'sidle',
      'sield',
      'siens',
      'sient',
      'sieth',
      'sieur',
      'sifts',
      'sighs',
      'sigil',
      'sigla',
      'signa',
      'signs',
      'sijos',
      'sikas',
      'siker',
      'sikes',
      'silds',
      'siled',
      'silen',
      'siler',
      'siles',
      'silex',
      'silks',
      'sills',
      'silos',
      'silts',
      'silty',
      'silva',
      'simar',
      'simas',
      'simba',
      'simis',
      'simps',
      'simul',
      'sinds',
      'sined',
      'sines',
      'sings',
      'sinhs',
      'sinks',
      'sinky',
      'sinus',
      'siped',
      'sipes',
      'sippy',
      'sired',
      'siree',
      'sires',
      'sirih',
      'siris',
      'siroc',
      'sirra',
      'sirup',
      'sisal',
      'sises',
      'sista',
      'sists',
      'sitar',
      'sited',
      'sites',
      'sithe',
      'sitka',
      'situp',
      'situs',
      'siver',
      'sixer',
      'sixes',
      'sixmo',
      'sixte',
      'sizar',
      'sized',
      'sizel',
      'sizer',
      'sizes',
      'skags',
      'skail',
      'skald',
      'skank',
      'skart',
      'skats',
      'skatt',
      'skaws',
      'skean',
      'skear',
      'skeds',
      'skeed',
      'skeef',
      'skeen',
      'skeer',
      'skees',
      'skeet',
      'skegg',
      'skegs',
      'skein',
      'skelf',
      'skell',
      'skelm',
      'skelp',
      'skene',
      'skens',
      'skeos',
      'skeps',
      'skers',
      'skets',
      'skews',
      'skids',
      'skied',
      'skies',
      'skiey',
      'skimo',
      'skims',
      'skink',
      'skins',
      'skint',
      'skios',
      'skips',
      'skirl',
      'skirr',
      'skite',
      'skits',
      'skive',
      'skivy',
      'sklim',
      'skoal',
      'skody',
      'skoff',
      'skogs',
      'skols',
      'skool',
      'skort',
      'skosh',
      'skran',
      'skrik',
      'skuas',
      'skugs',
      'skyed',
      'skyer',
      'skyey',
      'skyfs',
      'skyre',
      'skyrs',
      'skyte',
      'slabs',
      'slade',
      'slaes',
      'slags',
      'slaid',
      'slake',
      'slams',
      'slane',
      'slank',
      'slaps',
      'slart',
      'slats',
      'slaty',
      'slaws',
      'slays',
      'slebs',
      'sleds',
      'sleer',
      'slews',
      'sleys',
      'slier',
      'slily',
      'slims',
      'slipe',
      'slips',
      'slipt',
      'slish',
      'slits',
      'slive',
      'sloan',
      'slobs',
      'sloes',
      'slogs',
      'sloid',
      'slojd',
      'slomo',
      'sloom',
      'sloot',
      'slops',
      'slopy',
      'slorm',
      'slots',
      'slove',
      'slows',
      'sloyd',
      'slubb',
      'slubs',
      'slued',
      'slues',
      'sluff',
      'slugs',
      'sluit',
      'slums',
      'slurb',
      'slurs',
      'sluse',
      'sluts',
      'slyer',
      'slype',
      'smaak',
      'smaik',
      'smalm',
      'smalt',
      'smarm',
      'smaze',
      'smeek',
      'smees',
      'smeik',
      'smeke',
      'smerk',
      'smews',
      'smirr',
      'smirs',
      'smits',
      'smogs',
      'smoko',
      'smolt',
      'smoor',
      'smoot',
      'smore',
      'smorg',
      'smout',
      'smowt',
      'smugs',
      'smurs',
      'smush',
      'smuts',
      'snabs',
      'snafu',
      'snags',
      'snaps',
      'snarf',
      'snark',
      'snars',
      'snary',
      'snash',
      'snath',
      'snaws',
      'snead',
      'sneap',
      'snebs',
      'sneck',
      'sneds',
      'sneed',
      'snees',
      'snell',
      'snibs',
      'snick',
      'snies',
      'snift',
      'snigs',
      'snips',
      'snipy',
      'snirt',
      'snits',
      'snobs',
      'snods',
      'snoek',
      'snoep',
      'snogs',
      'snoke',
      'snood',
      'snook',
      'snool',
      'snoot',
      'snots',
      'snowk',
      'snows',
      'snubs',
      'snugs',
      'snush',
      'snyes',
      'soaks',
      'soaps',
      'soare',
      'soars',
      'soave',
      'sobas',
      'socas',
      'soces',
      'socko',
      'socks',
      'socle',
      'sodas',
      'soddy',
      'sodic',
      'sodom',
      'sofar',
      'sofas',
      'softa',
      'softs',
      'softy',
      'soger',
      'sohur',
      'soils',
      'soily',
      'sojas',
      'sojus',
      'sokah',
      'soken',
      'sokes',
      'sokol',
      'solah',
      'solan',
      'solas',
      'solde',
      'soldi',
      'soldo',
      'solds',
      'soled',
      'solei',
      'soler',
      'soles',
      'solon',
      'solos',
      'solum',
      'solus',
      'soman',
      'somas',
      'sonce',
      'sonde',
      'sones',
      'songs',
      'sonly',
      'sonne',
      'sonny',
      'sonse',
      'sonsy',
      'sooey',
      'sooks',
      'sooky',
      'soole',
      'sools',
      'sooms',
      'soops',
      'soote',
      'soots',
      'sophs',
      'sophy',
      'sopor',
      'soppy',
      'sopra',
      'soral',
      'soras',
      'sorbo',
      'sorbs',
      'sorda',
      'sordo',
      'sords',
      'sored',
      'soree',
      'sorel',
      'sorer',
      'sores',
      'sorex',
      'sorgo',
      'sorns',
      'sorra',
      'sorta',
      'sorts',
      'sorus',
      'soths',
      'sotol',
      'souce',
      'souct',
      'sough',
      'souks',
      'souls',
      'soums',
      'soups',
      'soupy',
      'sours',
      'souse',
      'souts',
      'sowar',
      'sowce',
      'sowed',
      'sowff',
      'sowfs',
      'sowle',
      'sowls',
      'sowms',
      'sownd',
      'sowne',
      'sowps',
      'sowse',
      'sowth',
      'soyas',
      'soyle',
      'soyuz',
      'sozin',
      'spacy',
      'spado',
      'spaed',
      'spaer',
      'spaes',
      'spags',
      'spahi',
      'spail',
      'spain',
      'spait',
      'spake',
      'spald',
      'spale',
      'spall',
      'spalt',
      'spams',
      'spane',
      'spang',
      'spans',
      'spard',
      'spars',
      'spart',
      'spate',
      'spats',
      'spaul',
      'spawl',
      'spaws',
      'spayd',
      'spays',
      'spaza',
      'spazz',
      'speal',
      'spean',
      'speat',
      'specs',
      'spect',
      'speel',
      'speer',
      'speil',
      'speir',
      'speks',
      'speld',
      'spelk',
      'speos',
      'spets',
      'speug',
      'spews',
      'spewy',
      'spial',
      'spica',
      'spick',
      'spics',
      'spide',
      'spier',
      'spies',
      'spiff',
      'spifs',
      'spiks',
      'spile',
      'spims',
      'spina',
      'spink',
      'spins',
      'spirt',
      'spiry',
      'spits',
      'spitz',
      'spivs',
      'splay',
      'splog',
      'spode',
      'spods',
      'spoom',
      'spoor',
      'spoot',
      'spork',
      'sposh',
      'spots',
      'sprad',
      'sprag',
      'sprat',
      'spred',
      'sprew',
      'sprit',
      'sprod',
      'sprog',
      'sprue',
      'sprug',
      'spuds',
      'spued',
      'spuer',
      'spues',
      'spugs',
      'spule',
      'spume',
      'spumy',
      'spurs',
      'sputa',
      'spyal',
      'spyre',
      'squab',
      'squaw',
      'squeg',
      'squid',
      'squit',
      'squiz',
      'stabs',
      'stade',
      'stags',
      'stagy',
      'staig',
      'stane',
      'stang',
      'staph',
      'staps',
      'starn',
      'starr',
      'stars',
      'stats',
      'staun',
      'staws',
      'stays',
      'stean',
      'stear',
      'stedd',
      'stede',
      'steds',
      'steek',
      'steem',
      'steen',
      'steil',
      'stela',
      'stele',
      'stell',
      'steme',
      'stems',
      'stend',
      'steno',
      'stens',
      'stent',
      'steps',
      'stept',
      'stere',
      'stets',
      'stews',
      'stewy',
      'steys',
      'stich',
      'stied',
      'sties',
      'stilb',
      'stile',
      'stime',
      'stims',
      'stimy',
      'stipa',
      'stipe',
      'stire',
      'stirk',
      'stirp',
      'stirs',
      'stive',
      'stivy',
      'stoae',
      'stoai',
      'stoas',
      'stoat',
      'stobs',
      'stoep',
      'stogy',
      'stoit',
      'stoln',
      'stoma',
      'stond',
      'stong',
      'stonk',
      'stonn',
      'stook',
      'stoor',
      'stope',
      'stops',
      'stopt',
      'stoss',
      'stots',
      'stott',
      'stoun',
      'stoup',
      'stour',
      'stown',
      'stowp',
      'stows',
      'strad',
      'strae',
      'strag',
      'strak',
      'strep',
      'strew',
      'stria',
      'strig',
      'strim',
      'strop',
      'strow',
      'stroy',
      'strum',
      'stubs',
      'stude',
      'studs',
      'stull',
      'stulm',
      'stumm',
      'stums',
      'stuns',
      'stupa',
      'stupe',
      'sture',
      'sturt',
      'styed',
      'styes',
      'styli',
      'stylo',
      'styme',
      'stymy',
      'styre',
      'styte',
      'subah',
      'subas',
      'subby',
      'suber',
      'subha',
      'succi',
      'sucks',
      'sucky',
      'sucre',
      'sudds',
      'sudor',
      'sudsy',
      'suede',
      'suent',
      'suers',
      'suete',
      'suets',
      'suety',
      'sugan',
      'sughs',
      'sugos',
      'suhur',
      'suids',
      'suint',
      'suits',
      'sujee',
      'sukhs',
      'sukuk',
      'sulci',
      'sulfa',
      'sulfo',
      'sulks',
      'sulph',
      'sulus',
      'sumis',
      'summa',
      'sumos',
      'sumph',
      'sumps',
      'sunis',
      'sunks',
      'sunna',
      'sunns',
      'sunup',
      'supes',
      'supra',
      'surah',
      'sural',
      'suras',
      'surat',
      'surds',
      'sured',
      'sures',
      'surfs',
      'surfy',
      'surgy',
      'surra',
      'sused',
      'suses',
      'susus',
      'sutor',
      'sutra',
      'sutta',
      'swabs',
      'swack',
      'swads',
      'swage',
      'swags',
      'swail',
      'swain',
      'swale',
      'swaly',
      'swamy',
      'swang',
      'swank',
      'swans',
      'swaps',
      'swapt',
      'sward',
      'sware',
      'swarf',
      'swart',
      'swats',
      'swayl',
      'sways',
      'sweal',
      'swede',
      'sweed',
      'sweel',
      'sweer',
      'swees',
      'sweir',
      'swelt',
      'swerf',
      'sweys',
      'swies',
      'swigs',
      'swile',
      'swims',
      'swink',
      'swipe',
      'swire',
      'swiss',
      'swith',
      'swits',
      'swive',
      'swizz',
      'swobs',
      'swole',
      'swoln',
      'swops',
      'swopt',
      'swots',
      'swoun',
      'sybbe',
      'sybil',
      'syboe',
      'sybow',
      'sycee',
      'syces',
      'sycon',
      'syens',
      'syker',
      'sykes',
      'sylis',
      'sylph',
      'sylva',
      'symar',
      'synch',
      'syncs',
      'synds',
      'syned',
      'synes',
      'synth',
      'syped',
      'sypes',
      'syphs',
      'syrah',
      'syren',
      'sysop',
      'sythe',
      'syver',
      'taals',
      'taata',
      'taber',
      'tabes',
      'tabid',
      'tabis',
      'tabla',
      'tabor',
      'tabun',
      'tabus',
      'tacan',
      'taces',
      'tacet',
      'tache',
      'tacho',
      'tachs',
      'tacks',
      'tacos',
      'tacts',
      'taels',
      'tafia',
      'taggy',
      'tagma',
      'tahas',
      'tahrs',
      'taiga',
      'taigs',
      'taiko',
      'tails',
      'tains',
      'taira',
      'taish',
      'taits',
      'tajes',
      'takas',
      'takes',
      'takhi',
      'takin',
      'takis',
      'takky',
      'talak',
      'talaq',
      'talar',
      'talas',
      'talcs',
      'talcy',
      'talea',
      'taler',
      'tales',
      'talks',
      'talky',
      'talls',
      'talma',
      'talpa',
      'taluk',
      'talus',
      'tamal',
      'tamed',
      'tames',
      'tamin',
      'tamis',
      'tammy',
      'tamps',
      'tanas',
      'tanga',
      'tangi',
      'tangs',
      'tanhs',
      'tanka',
      'tanks',
      'tanky',
      'tanna',
      'tansy',
      'tanti',
      'tanto',
      'tanty',
      'tapas',
      'taped',
      'tapen',
      'tapes',
      'tapet',
      'tapis',
      'tappa',
      'tapus',
      'taras',
      'tardo',
      'tared',
      'tares',
      'targa',
      'targe',
      'tarns',
      'taroc',
      'tarok',
      'taros',
      'tarps',
      'tarre',
      'tarry',
      'tarsi',
      'tarts',
      'tarty',
      'tasar',
      'tased',
      'taser',
      'tases',
      'tasks',
      'tassa',
      'tasse',
      'tasso',
      'tatar',
      'tater',
      'tates',
      'taths',
      'tatie',
      'tatou',
      'tatts',
      'tatus',
      'taube',
      'tauld',
      'tauon',
      'taupe',
      'tauts',
      'tavah',
      'tavas',
      'taver',
      'tawai',
      'tawas',
      'tawed',
      'tawer',
      'tawie',
      'tawse',
      'tawts',
      'taxed',
      'taxer',
      'taxes',
      'taxis',
      'taxol',
      'taxon',
      'taxor',
      'taxus',
      'tayra',
      'tazza',
      'tazze',
      'teade',
      'teads',
      'teaed',
      'teaks',
      'teals',
      'teams',
      'tears',
      'teats',
      'teaze',
      'techs',
      'techy',
      'tecta',
      'teels',
      'teems',
      'teend',
      'teene',
      'teens',
      'teeny',
      'teers',
      'teffs',
      'teggs',
      'tegua',
      'tegus',
      'tehrs',
      'teiid',
      'teils',
      'teind',
      'teins',
      'telae',
      'telco',
      'teles',
      'telex',
      'telia',
      'telic',
      'tells',
      'telly',
      'teloi',
      'telos',
      'temed',
      'temes',
      'tempi',
      'temps',
      'tempt',
      'temse',
      'tench',
      'tends',
      'tendu',
      'tenes',
      'tenge',
      'tenia',
      'tenne',
      'tenno',
      'tenny',
      'tenon',
      'tents',
      'tenty',
      'tenue',
      'tepal',
      'tepas',
      'tepoy',
      'terai',
      'teras',
      'terce',
      'terek',
      'teres',
      'terfe',
      'terfs',
      'terga',
      'terms',
      'terne',
      'terns',
      'terry',
      'terts',
      'tesla',
      'testa',
      'teste',
      'tests',
      'tetes',
      'teths',
      'tetra',
      'tetri',
      'teuch',
      'teugh',
      'tewed',
      'tewel',
      'tewit',
      'texas',
      'texes',
      'texts',
      'thack',
      'thagi',
      'thaim',
      'thale',
      'thali',
      'thana',
      'thane',
      'thang',
      'thans',
      'thanx',
      'tharm',
      'thars',
      'thaws',
      'thawy',
      'thebe',
      'theca',
      'theed',
      'theek',
      'thees',
      'thegn',
      'theic',
      'thein',
      'thelf',
      'thema',
      'thens',
      'theow',
      'therm',
      'thesp',
      'thete',
      'thews',
      'thewy',
      'thigs',
      'thilk',
      'thill',
      'thine',
      'thins',
      'thiol',
      'thirl',
      'thoft',
      'thole',
      'tholi',
      'thoro',
      'thorp',
      'thous',
      'thowl',
      'thrae',
      'thraw',
      'thrid',
      'thrip',
      'throe',
      'thuds',
      'thugs',
      'thuja',
      'thunk',
      'thurl',
      'thuya',
      'thymi',
      'thymy',
      'tians',
      'tiars',
      'tical',
      'ticca',
      'ticed',
      'tices',
      'tichy',
      'ticks',
      'ticky',
      'tiddy',
      'tided',
      'tides',
      'tiers',
      'tiffs',
      'tifos',
      'tifts',
      'tiges',
      'tigon',
      'tikas',
      'tikes',
      'tikis',
      'tikka',
      'tilak',
      'tiled',
      'tiler',
      'tiles',
      'tills',
      'tilly',
      'tilth',
      'tilts',
      'timbo',
      'timed',
      'times',
      'timon',
      'timps',
      'tinas',
      'tinct',
      'tinds',
      'tinea',
      'tined',
      'tines',
      'tinge',
      'tings',
      'tinks',
      'tinny',
      'tints',
      'tinty',
      'tipis',
      'tippy',
      'tired',
      'tires',
      'tirls',
      'tiros',
      'tirrs',
      'titch',
      'titer',
      'titis',
      'titre',
      'titty',
      'titup',
      'tiyin',
      'tiyns',
      'tizes',
      'tizzy',
      'toads',
      'toady',
      'toaze',
      'tocks',
      'tocky',
      'tocos',
      'todde',
      'toeas',
      'toffs',
      'toffy',
      'tofts',
      'tofus',
      'togae',
      'togas',
      'toged',
      'toges',
      'togue',
      'tohos',
      'toile',
      'toils',
      'toing',
      'toise',
      'toits',
      'tokay',
      'toked',
      'toker',
      'tokes',
      'tokos',
      'tolan',
      'tolar',
      'tolas',
      'toled',
      'toles',
      'tolls',
      'tolly',
      'tolts',
      'tolus',
      'tolyl',
      'toman',
      'tombs',
      'tomes',
      'tomia',
      'tommy',
      'tomos',
      'tondi',
      'tondo',
      'toned',
      'toner',
      'tones',
      'toney',
      'tongs',
      'tonka',
      'tonks',
      'tonne',
      'tonus',
      'tools',
      'tooms',
      'toons',
      'toots',
      'toped',
      'topee',
      'topek',
      'toper',
      'topes',
      'tophe',
      'tophi',
      'tophs',
      'topis',
      'topoi',
      'topos',
      'toppy',
      'toque',
      'torah',
      'toran',
      'toras',
      'torcs',
      'tores',
      'toric',
      'torii',
      'toros',
      'torot',
      'torrs',
      'torse',
      'torsi',
      'torsk',
      'torta',
      'torte',
      'torts',
      'tosas',
      'tosed',
      'toses',
      'toshy',
      'tossy',
      'toted',
      'toter',
      'totes',
      'totty',
      'touks',
      'touns',
      'tours',
      'touse',
      'tousy',
      'touts',
      'touze',
      'touzy',
      'towed',
      'towie',
      'towns',
      'towny',
      'towse',
      'towsy',
      'towts',
      'towze',
      'towzy',
      'toyed',
      'toyer',
      'toyon',
      'toyos',
      'tozed',
      'tozes',
      'tozie',
      'trabs',
      'trads',
      'tragi',
      'traik',
      'trams',
      'trank',
      'tranq',
      'trans',
      'trant',
      'trape',
      'traps',
      'trapt',
      'trass',
      'trats',
      'tratt',
      'trave',
      'trayf',
      'trays',
      'treck',
      'treed',
      'treen',
      'trees',
      'trefa',
      'treif',
      'treks',
      'trema',
      'trems',
      'tress',
      'trest',
      'trets',
      'trews',
      'treyf',
      'treys',
      'triac',
      'tride',
      'trier',
      'tries',
      'triff',
      'trigo',
      'trigs',
      'trike',
      'trild',
      'trill',
      'trims',
      'trine',
      'trins',
      'triol',
      'trior',
      'trios',
      'trips',
      'tripy',
      'trist',
      'troad',
      'troak',
      'troat',
      'trock',
      'trode',
      'trods',
      'trogs',
      'trois',
      'troke',
      'tromp',
      'trona',
      'tronc',
      'trone',
      'tronk',
      'trons',
      'trooz',
      'troth',
      'trots',
      'trows',
      'troys',
      'trued',
      'trues',
      'trugo',
      'trugs',
      'trull',
      'tryer',
      'tryke',
      'tryma',
      'tryps',
      'tsade',
      'tsadi',
      'tsars',
      'tsked',
      'tsuba',
      'tsubo',
      'tuans',
      'tuart',
      'tuath',
      'tubae',
      'tubar',
      'tubas',
      'tubby',
      'tubed',
      'tubes',
      'tucks',
      'tufas',
      'tuffe',
      'tuffs',
      'tufts',
      'tufty',
      'tugra',
      'tuile',
      'tuina',
      'tuism',
      'tuktu',
      'tules',
      'tulpa',
      'tulsi',
      'tumid',
      'tummy',
      'tumps',
      'tumpy',
      'tunas',
      'tunds',
      'tuned',
      'tuner',
      'tunes',
      'tungs',
      'tunny',
      'tupek',
      'tupik',
      'tuple',
      'tuque',
      'turds',
      'turfs',
      'turfy',
      'turks',
      'turme',
      'turms',
      'turns',
      'turnt',
      'turps',
      'turrs',
      'tushy',
      'tusks',
      'tusky',
      'tutee',
      'tutti',
      'tutty',
      'tutus',
      'tuxes',
      'tuyer',
      'twaes',
      'twain',
      'twals',
      'twank',
      'twats',
      'tways',
      'tweel',
      'tween',
      'tweep',
      'tweer',
      'twerk',
      'twerp',
      'twier',
      'twigs',
      'twill',
      'twilt',
      'twink',
      'twins',
      'twiny',
      'twire',
      'twirp',
      'twite',
      'twits',
      'twoer',
      'twyer',
      'tyees',
      'tyers',
      'tyiyn',
      'tykes',
      'tyler',
      'tymps',
      'tynde',
      'tyned',
      'tynes',
      'typal',
      'typed',
      'types',
      'typey',
      'typic',
      'typos',
      'typps',
      'typto',
      'tyran',
      'tyred',
      'tyres',
      'tyros',
      'tythe',
      'tzars',
      'udals',
      'udons',
      'ugali',
      'ugged',
      'uhlan',
      'uhuru',
      'ukase',
      'ulama',
      'ulans',
      'ulema',
      'ulmin',
      'ulnad',
      'ulnae',
      'ulnar',
      'ulnas',
      'ulpan',
      'ulvas',
      'ulyie',
      'ulzie',
      'umami',
      'umbel',
      'umber',
      'umble',
      'umbos',
      'umbre',
      'umiac',
      'umiak',
      'umiaq',
      'ummah',
      'ummas',
      'ummed',
      'umped',
      'umphs',
      'umpie',
      'umpty',
      'umrah',
      'umras',
      'unais',
      'unapt',
      'unarm',
      'unary',
      'unaus',
      'unbag',
      'unban',
      'unbar',
      'unbed',
      'unbid',
      'unbox',
      'uncap',
      'unces',
      'uncia',
      'uncos',
      'uncoy',
      'uncus',
      'undam',
      'undee',
      'undos',
      'undug',
      'uneth',
      'unfix',
      'ungag',
      'unget',
      'ungod',
      'ungot',
      'ungum',
      'unhat',
      'unhip',
      'unica',
      'units',
      'unjam',
      'unked',
      'unket',
      'unkid',
      'unlaw',
      'unlay',
      'unled',
      'unlet',
      'unlid',
      'unman',
      'unmew',
      'unmix',
      'unpay',
      'unpeg',
      'unpen',
      'unpin',
      'unred',
      'unrid',
      'unrig',
      'unrip',
      'unsaw',
      'unsay',
      'unsee',
      'unsew',
      'unsex',
      'unsod',
      'untax',
      'untin',
      'unwet',
      'unwit',
      'unwon',
      'upbow',
      'upbye',
      'updos',
      'updry',
      'upend',
      'upjet',
      'uplay',
      'upled',
      'uplit',
      'upped',
      'upran',
      'uprun',
      'upsee',
      'upsey',
      'uptak',
      'upter',
      'uptie',
      'uraei',
      'urali',
      'uraos',
      'urare',
      'urari',
      'urase',
      'urate',
      'urbex',
      'urbia',
      'urdee',
      'ureal',
      'ureas',
      'uredo',
      'ureic',
      'urena',
      'urent',
      'urged',
      'urger',
      'urges',
      'urial',
      'urite',
      'urman',
      'urnal',
      'urned',
      'urped',
      'ursae',
      'ursid',
      'urson',
      'urubu',
      'urvas',
      'users',
      'usnea',
      'usque',
      'usure',
      'usury',
      'uteri',
      'uveal',
      'uveas',
      'uvula',
      'vacua',
      'vaded',
      'vades',
      'vagal',
      'vagus',
      'vails',
      'vaire',
      'vairs',
      'vairy',
      'vakas',
      'vakil',
      'vales',
      'valis',
      'valse',
      'vamps',
      'vampy',
      'vanda',
      'vaned',
      'vanes',
      'vangs',
      'vants',
      'vaped',
      'vaper',
      'vapes',
      'varan',
      'varas',
      'vardy',
      'varec',
      'vares',
      'varia',
      'varix',
      'varna',
      'varus',
      'varve',
      'vasal',
      'vases',
      'vasts',
      'vasty',
      'vatic',
      'vatus',
      'vauch',
      'vaute',
      'vauts',
      'vawte',
      'vaxes',
      'veale',
      'veals',
      'vealy',
      'veena',
      'veeps',
      'veers',
      'veery',
      'vegas',
      'veges',
      'vegie',
      'vegos',
      'vehme',
      'veils',
      'veily',
      'veins',
      'veiny',
      'velar',
      'velds',
      'veldt',
      'veles',
      'vells',
      'velum',
      'venae',
      'venal',
      'vends',
      'vendu',
      'veney',
      'venge',
      'venin',
      'vents',
      'venus',
      'verbs',
      'verra',
      'verry',
      'verst',
      'verts',
      'vertu',
      'vespa',
      'vesta',
      'vests',
      'vetch',
      'vexed',
      'vexer',
      'vexes',
      'vexil',
      'vezir',
      'vials',
      'viand',
      'vibes',
      'vibex',
      'vibey',
      'viced',
      'vices',
      'vichy',
      'viers',
      'views',
      'viewy',
      'vifda',
      'viffs',
      'vigas',
      'vigia',
      'vilde',
      'viler',
      'villi',
      'vills',
      'vimen',
      'vinal',
      'vinas',
      'vinca',
      'vined',
      'viner',
      'vines',
      'vinew',
      'vinic',
      'vinos',
      'vints',
      'viold',
      'viols',
      'vired',
      'vireo',
      'vires',
      'virga',
      'virge',
      'virid',
      'virls',
      'virtu',
      'visas',
      'vised',
      'vises',
      'visie',
      'visne',
      'vison',
      'visto',
      'vitae',
      'vitas',
      'vitex',
      'vitro',
      'vitta',
      'vivas',
      'vivat',
      'vivda',
      'viver',
      'vives',
      'vizir',
      'vizor',
      'vleis',
      'vlies',
      'vlogs',
      'voars',
      'vocab',
      'voces',
      'voddy',
      'vodou',
      'vodun',
      'voema',
      'vogie',
      'voids',
      'voile',
      'voips',
      'volae',
      'volar',
      'voled',
      'voles',
      'volet',
      'volks',
      'volta',
      'volte',
      'volti',
      'volts',
      'volva',
      'volve',
      'vomer',
      'voted',
      'votes',
      'vouge',
      'voulu',
      'vowed',
      'vower',
      'voxel',
      'vozhd',
      'vraic',
      'vrils',
      'vroom',
      'vrous',
      'vrouw',
      'vrows',
      'vuggs',
      'vuggy',
      'vughs',
      'vughy',
      'vulgo',
      'vulns',
      'vulva',
      'vutty',
      'waacs',
      'wacke',
      'wacko',
      'wacks',
      'wadds',
      'waddy',
      'waded',
      'wader',
      'wades',
      'wadge',
      'wadis',
      'wadts',
      'waffs',
      'wafts',
      'waged',
      'wages',
      'wagga',
      'wagyu',
      'wahoo',
      'waide',
      'waifs',
      'waift',
      'wails',
      'wains',
      'wairs',
      'waite',
      'waits',
      'wakas',
      'waked',
      'waken',
      'waker',
      'wakes',
      'wakfs',
      'waldo',
      'walds',
      'waled',
      'waler',
      'wales',
      'walie',
      'walis',
      'walks',
      'walla',
      'walls',
      'wally',
      'walty',
      'wamed',
      'wames',
      'wamus',
      'wands',
      'waned',
      'wanes',
      'waney',
      'wangs',
      'wanks',
      'wanky',
      'wanle',
      'wanly',
      'wanna',
      'wants',
      'wanty',
      'wanze',
      'waqfs',
      'warbs',
      'warby',
      'wards',
      'wared',
      'wares',
      'warez',
      'warks',
      'warms',
      'warns',
      'warps',
      'warre',
      'warst',
      'warts',
      'wases',
      'washy',
      'wasms',
      'wasps',
      'waspy',
      'wasts',
      'watap',
      'watts',
      'wauff',
      'waugh',
      'wauks',
      'waulk',
      'wauls',
      'waurs',
      'waved',
      'waves',
      'wavey',
      'wawas',
      'wawes',
      'wawls',
      'waxed',
      'waxer',
      'waxes',
      'wayed',
      'wazir',
      'wazoo',
      'weald',
      'weals',
      'weamb',
      'weans',
      'wears',
      'webby',
      'weber',
      'wecht',
      'wedel',
      'wedgy',
      'weeds',
      'weeke',
      'weeks',
      'weels',
      'weems',
      'weens',
      'weeny',
      'weeps',
      'weepy',
      'weest',
      'weete',
      'weets',
      'wefte',
      'wefts',
      'weids',
      'weils',
      'weirs',
      'weise',
      'weize',
      'wekas',
      'welds',
      'welke',
      'welks',
      'welkt',
      'wells',
      'welly',
      'welts',
      'wembs',
      'wends',
      'wenge',
      'wenny',
      'wents',
      'weros',
      'wersh',
      'wests',
      'wetas',
      'wetly',
      'wexed',
      'wexes',
      'whamo',
      'whams',
      'whang',
      'whaps',
      'whare',
      'whata',
      'whats',
      'whaup',
      'whaur',
      'wheal',
      'whear',
      'wheen',
      'wheep',
      'wheft',
      'whelk',
      'whelm',
      'whens',
      'whets',
      'whews',
      'wheys',
      'whids',
      'whift',
      'whigs',
      'whilk',
      'whims',
      'whins',
      'whios',
      'whips',
      'whipt',
      'whirr',
      'whirs',
      'whish',
      'whiss',
      'whist',
      'whits',
      'whity',
      'whizz',
      'whomp',
      'whoof',
      'whoot',
      'whops',
      'whore',
      'whorl',
      'whort',
      'whoso',
      'whows',
      'whump',
      'whups',
      'whyda',
      'wicca',
      'wicks',
      'wicky',
      'widdy',
      'wides',
      'wiels',
      'wifed',
      'wifes',
      'wifey',
      'wifie',
      'wifty',
      'wigan',
      'wigga',
      'wiggy',
      'wikis',
      'wilco',
      'wilds',
      'wiled',
      'wiles',
      'wilga',
      'wilis',
      'wilja',
      'wills',
      'wilts',
      'wimps',
      'winds',
      'wined',
      'wines',
      'winey',
      'winge',
      'wings',
      'wingy',
      'winks',
      'winna',
      'winns',
      'winos',
      'winze',
      'wiped',
      'wiper',
      'wipes',
      'wired',
      'wirer',
      'wires',
      'wirra',
      'wised',
      'wises',
      'wisha',
      'wisht',
      'wisps',
      'wists',
      'witan',
      'wited',
      'wites',
      'withe',
      'withs',
      'withy',
      'wived',
      'wiver',
      'wives',
      'wizen',
      'wizes',
      'woads',
      'woald',
      'wocks',
      'wodge',
      'woful',
      'wojus',
      'woker',
      'wokka',
      'wolds',
      'wolfs',
      'wolly',
      'wolve',
      'wombs',
      'womby',
      'womyn',
      'wonga',
      'wongi',
      'wonks',
      'wonky',
      'wonts',
      'woods',
      'wooed',
      'woofs',
      'woofy',
      'woold',
      'wools',
      'woons',
      'woops',
      'woopy',
      'woose',
      'woosh',
      'wootz',
      'words',
      'works',
      'worms',
      'wormy',
      'worts',
      'wowed',
      'wowee',
      'woxen',
      'wrang',
      'wraps',
      'wrapt',
      'wrast',
      'wrate',
      'wrawl',
      'wrens',
      'wrick',
      'wried',
      'wrier',
      'wries',
      'writs',
      'wroke',
      'wroot',
      'wroth',
      'wryer',
      'wuddy',
      'wudus',
      'wulls',
      'wurst',
      'wuses',
      'wushu',
      'wussy',
      'wuxia',
      'wyled',
      'wyles',
      'wynds',
      'wynns',
      'wyted',
      'wytes',
      'xebec',
      'xenia',
      'xenic',
      'xenon',
      'xeric',
      'xerox',
      'xerus',
      'xoana',
      'xrays',
      'xylan',
      'xylem',
      'xylic',
      'xylol',
      'xylyl',
      'xysti',
      'xysts',
      'yaars',
      'yabas',
      'yabba',
      'yabby',
      'yacca',
      'yacka',
      'yacks',
      'yaffs',
      'yager',
      'yages',
      'yagis',
      'yahoo',
      'yaird',
      'yakka',
      'yakow',
      'yales',
      'yamen',
      'yampy',
      'yamun',
      'yangs',
      'yanks',
      'yapok',
      'yapon',
      'yapps',
      'yappy',
      'yarak',
      'yarco',
      'yards',
      'yarer',
      'yarfa',
      'yarks',
      'yarns',
      'yarrs',
      'yarta',
      'yarto',
      'yates',
      'yauds',
      'yauld',
      'yaups',
      'yawed',
      'yawey',
      'yawls',
      'yawns',
      'yawny',
      'yawps',
      'ybore',
      'yclad',
      'ycled',
      'ycond',
      'ydrad',
      'ydred',
      'yeads',
      'yeahs',
      'yealm',
      'yeans',
      'yeard',
      'years',
      'yecch',
      'yechs',
      'yechy',
      'yedes',
      'yeeds',
      'yeesh',
      'yeggs',
      'yelks',
      'yells',
      'yelms',
      'yelps',
      'yelts',
      'yenta',
      'yente',
      'yerba',
      'yerds',
      'yerks',
      'yeses',
      'yesks',
      'yests',
      'yesty',
      'yetis',
      'yetts',
      'yeuks',
      'yeuky',
      'yeven',
      'yeves',
      'yewen',
      'yexed',
      'yexes',
      'yfere',
      'yiked',
      'yikes',
      'yills',
      'yince',
      'yipes',
      'yippy',
      'yirds',
      'yirks',
      'yirrs',
      'yirth',
      'yites',
      'yitie',
      'ylems',
      'ylike',
      'ylkes',
      'ymolt',
      'ympes',
      'yobbo',
      'yobby',
      'yocks',
      'yodel',
      'yodhs',
      'yodle',
      'yogas',
      'yogee',
      'yoghs',
      'yogic',
      'yogin',
      'yogis',
      'yoick',
      'yojan',
      'yoked',
      'yokel',
      'yoker',
      'yokes',
      'yokul',
      'yolks',
      'yolky',
      'yomim',
      'yomps',
      'yonic',
      'yonis',
      'yonks',
      'yoofs',
      'yoops',
      'yores',
      'yorks',
      'yorps',
      'youks',
      'yourn',
      'yours',
      'yourt',
      'youse',
      'yowed',
      'yowes',
      'yowie',
      'yowls',
      'yowza',
      'yrapt',
      'yrent',
      'yrivd',
      'yrneh',
      'ysame',
      'ytost',
      'yuans',
      'yucas',
      'yucca',
      'yucch',
      'yucko',
      'yucks',
      'yucky',
      'yufts',
      'yugas',
      'yuked',
      'yukes',
      'yukky',
      'yukos',
      'yulan',
      'yules',
      'yummo',
      'yummy',
      'yumps',
      'yupon',
      'yuppy',
      'yurta',
      'yurts',
      'yuzus',
      'zabra',
      'zacks',
      'zaida',
      'zaidy',
      'zaire',
      'zakat',
      'zaman',
      'zambo',
      'zamia',
      'zanja',
      'zante',
      'zanza',
      'zanze',
      'zappy',
      'zarfs',
      'zaris',
      'zatis',
      'zaxes',
      'zayin',
      'zazen',
      'zeals',
      'zebec',
      'zebub',
      'zebus',
      'zedas',
      'zeins',
      'zendo',
      'zerda',
      'zerks',
      'zeros',
      'zests',
      'zetas',
      'zexes',
      'zezes',
      'zhomo',
      'zibet',
      'ziffs',
      'zigan',
      'zilas',
      'zilch',
      'zilla',
      'zills',
      'zimbi',
      'zimbs',
      'zinco',
      'zincs',
      'zincy',
      'zineb',
      'zines',
      'zings',
      'zingy',
      'zinke',
      'zinky',
      'zippo',
      'zippy',
      'ziram',
      'zitis',
      'zizel',
      'zizit',
      'zlote',
      'zloty',
      'zoaea',
      'zobos',
      'zobus',
      'zocco',
      'zoeae',
      'zoeal',
      'zoeas',
      'zoism',
      'zoist',
      'zombi',
      'zonae',
      'zonda',
      'zoned',
      'zoner',
      'zones',
      'zonks',
      'zooea',
      'zooey',
      'zooid',
      'zooks',
      'zooms',
      'zoons',
      'zooty',
      'zoppa',
      'zoppo',
      'zoril',
      'zoris',
      'zorro',
      'zouks',
      'zowee',
      'zowie',
      'zulus',
      'zupan',
      'zupas',
      'zuppa',
      'zurfs',
      'zuzim',
      'zygal',
      'zygon',
      'zymes',
      'zymic'
    ];

    const rowColorFilter = (row, index) => {
        for(let i =0; i<row.length; i++){
          if(row[i].color == ' #B4A037'){
            for(let j =i+1; j<row.length; j++){
              if(row[i].char == row[j].char && row[j].color=='#538D4C'){
                row.splice(i,1);
                j--;
              }else if(row[i].char == row[j].char && row[j].color==' #B4A037'){
                row.splice(j,1);
                j--;
              }
            }
          } 
          else if(row[i].color == '#538D4C'){
            for(let j =i+1; j<row.length; j++){
              if(row[i].char == row[j].char && row[j].color==' #B4A037'){
                row.splice(j,1);
                j--;
              }else if(row[i].char == row[j].char && row[j].color=='#538D4C'){
                row.splice(i,1);
                j--;
              }
            }
          } 
          else if(row[i].color == '#3A3A3C'){
            for(let j =i+1; j<row.length; j++){
              if(row[i].char == row[j].char && row[j].color=='#3A3A3C'){
                row.splice(i,1);
                j--;
              }
            }
          }

        }
    };

    /* src\components\Wordle.svelte generated by Svelte v3.46.4 */

    const { console: console_1 } = globals;
    const file$1 = "src\\components\\Wordle.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    // (174:6) {#each word as item, i}
    function create_each_block_4(ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*item*/ ctx[40] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div0, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");
    			set_style(div0, "background-color", /*colors*/ ctx[7][/*i*/ ctx[42]]);
    			add_location(div0, file$1, 175, 10, 5537);
    			attr_dev(div1, "class", "col my-1");
    			add_location(div1, file$1, 174, 8, 5503);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*word*/ 8 && t0_value !== (t0_value = /*item*/ ctx[40] + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*colors*/ 128) {
    				set_style(div0, "background-color", /*colors*/ ctx[7][/*i*/ ctx[42]]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(174:6) {#each word as item, i}",
    		ctx
    	});

    	return block;
    }

    // (188:6) {#each falseArray as item}
    function create_each_block_3(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let div3;
    	let div2;
    	let t1;
    	let div5;
    	let div4;
    	let t2;
    	let div7;
    	let div6;
    	let t3;
    	let div9;
    	let div8;
    	let t4;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			t1 = space();
    			div5 = element("div");
    			div4 = element("div");
    			t2 = space();
    			div7 = element("div");
    			div6 = element("div");
    			t3 = space();
    			div9 = element("div");
    			div8 = element("div");
    			t4 = space();
    			attr_dev(div0, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");
    			add_location(div0, file$1, 189, 10, 5948);
    			attr_dev(div1, "class", "col my-1");
    			add_location(div1, file$1, 188, 8, 5914);
    			attr_dev(div2, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");
    			add_location(div2, file$1, 192, 10, 6078);
    			attr_dev(div3, "class", "col my-1");
    			add_location(div3, file$1, 191, 8, 6044);
    			attr_dev(div4, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");
    			add_location(div4, file$1, 195, 10, 6208);
    			attr_dev(div5, "class", "col my-1");
    			add_location(div5, file$1, 194, 8, 6174);
    			attr_dev(div6, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");
    			add_location(div6, file$1, 200, 10, 6364);
    			attr_dev(div7, "class", "col my-1");
    			add_location(div7, file$1, 199, 8, 6330);
    			attr_dev(div8, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");
    			add_location(div8, file$1, 205, 10, 6520);
    			attr_dev(div9, "class", "col my-1");
    			add_location(div9, file$1, 204, 8, 6486);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div9, t4);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(188:6) {#each falseArray as item}",
    		ctx
    	});

    	return block;
    }

    // (219:10) {#key firstRowColors}
    function create_key_block_2(ctx) {
    	let div;
    	let t_value = /*item*/ ctx[40] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");

    			set_style(div, "background-color", /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*firstRowColors*/ ctx[8])
    			? /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*firstRowColors*/ ctx[8])
    			: '#828385');

    			add_location(div, file$1, 219, 12, 6985);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*firstRowColors*/ 256) {
    				set_style(div, "background-color", /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*firstRowColors*/ ctx[8])
    				? /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*firstRowColors*/ ctx[8])
    				: '#828385');
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_2.name,
    		type: "key",
    		source: "(219:10) {#key firstRowColors}",
    		ctx
    	});

    	return block;
    }

    // (217:6) {#each charSet[0] as item, i (i)}
    function create_each_block_2(key_1, ctx) {
    	let div;
    	let previous_key = /*firstRowColors*/ ctx[8];
    	let t;
    	let mounted;
    	let dispose;
    	let key_block = create_key_block_2(ctx);

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[19](/*item*/ ctx[40]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			key_block.c();
    			t = space();
    			attr_dev(div, "class", "col my-1 c-p svelte-15torbd");
    			add_location(div, file$1, 217, 8, 6869);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			key_block.m(div, null);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_2, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*firstRowColors*/ 256 && safe_not_equal(previous_key, previous_key = /*firstRowColors*/ ctx[8])) {
    				key_block.d(1);
    				key_block = create_key_block_2(ctx);
    				key_block.c();
    				key_block.m(div, t);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			key_block.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(217:6) {#each charSet[0] as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    // (236:10) {#key secondRowColors}
    function create_key_block_1(ctx) {
    	let div;
    	let t_value = /*item*/ ctx[40] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");

    			set_style(div, "background-color", /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*secondRowColors*/ ctx[9])
    			? /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*secondRowColors*/ ctx[9])
    			: '#828385');

    			add_location(div, file$1, 236, 12, 7583);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*secondRowColors*/ 512) {
    				set_style(div, "background-color", /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*secondRowColors*/ ctx[9])
    				? /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*secondRowColors*/ ctx[9])
    				: '#828385');
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_1.name,
    		type: "key",
    		source: "(236:10) {#key secondRowColors}",
    		ctx
    	});

    	return block;
    }

    // (234:6) {#each charSet[1] as item, i (i)}
    function create_each_block_1(key_1, ctx) {
    	let div;
    	let previous_key = /*secondRowColors*/ ctx[9];
    	let t;
    	let mounted;
    	let dispose;
    	let key_block = create_key_block_1(ctx);

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[20](/*item*/ ctx[40]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			key_block.c();
    			t = space();
    			attr_dev(div, "class", "col my-1 c-p svelte-15torbd");
    			add_location(div, file$1, 234, 8, 7466);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			key_block.m(div, null);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*secondRowColors*/ 512 && safe_not_equal(previous_key, previous_key = /*secondRowColors*/ ctx[9])) {
    				key_block.d(1);
    				key_block = create_key_block_1(ctx);
    				key_block.c();
    				key_block.m(div, t);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			key_block.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(234:6) {#each charSet[1] as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    // (253:10) {#key thirdRowColors}
    function create_key_block(ctx) {
    	let div;
    	let t_value = /*item*/ ctx[40] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");

    			set_style(div, "background-color", /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*thirdRowColors*/ ctx[10])
    			? /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*thirdRowColors*/ ctx[10])
    			: '#828385');

    			add_location(div, file$1, 253, 12, 8178);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*thirdRowColors*/ 1024) {
    				set_style(div, "background-color", /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*thirdRowColors*/ ctx[10])
    				? /*colorReturn*/ ctx[13](/*item*/ ctx[40], /*thirdRowColors*/ ctx[10])
    				: '#828385');
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block.name,
    		type: "key",
    		source: "(253:10) {#key thirdRowColors}",
    		ctx
    	});

    	return block;
    }

    // (251:6) {#each charSet[2] as item, i (i)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let previous_key = /*thirdRowColors*/ ctx[10];
    	let mounted;
    	let dispose;
    	let key_block = create_key_block(ctx);

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[21](/*item*/ ctx[40]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			key_block.c();
    			attr_dev(div, "class", "col my-1 c-p svelte-15torbd");
    			add_location(div, file$1, 251, 8, 8062);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			key_block.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_4, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*thirdRowColors*/ 1024 && safe_not_equal(previous_key, previous_key = /*thirdRowColors*/ ctx[10])) {
    				key_block.d(1);
    				key_block = create_key_block(ctx);
    				key_block.c();
    				key_block.m(div, null);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			key_block.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(251:6) {#each charSet[2] as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    // (272:2) {#if openModal && !modalName}
    function create_if_block_2(ctx) {
    	let wordlemodal;
    	let updating_openModal;
    	let updating_title;
    	let updating_subtitle;
    	let current;

    	function wordlemodal_openModal_binding(value) {
    		/*wordlemodal_openModal_binding*/ ctx[23](value);
    	}

    	function wordlemodal_title_binding(value) {
    		/*wordlemodal_title_binding*/ ctx[24](value);
    	}

    	function wordlemodal_subtitle_binding(value) {
    		/*wordlemodal_subtitle_binding*/ ctx[25](value);
    	}

    	let wordlemodal_props = {
    		titleColor: /*title*/ ctx[1] == 'Congratulations'
    		? 'text-success'
    		: 'text-danger',
    		backgroundColor: /*lightTheme*/ ctx[5] ? 'bg-info' : 'bg-black',
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*openModal*/ ctx[0] !== void 0) {
    		wordlemodal_props.openModal = /*openModal*/ ctx[0];
    	}

    	if (/*title*/ ctx[1] !== void 0) {
    		wordlemodal_props.title = /*title*/ ctx[1];
    	}

    	if (/*subtitle*/ ctx[2] !== void 0) {
    		wordlemodal_props.subtitle = /*subtitle*/ ctx[2];
    	}

    	wordlemodal = new WordleModal({ props: wordlemodal_props, $$inline: true });
    	binding_callbacks.push(() => bind(wordlemodal, 'openModal', wordlemodal_openModal_binding));
    	binding_callbacks.push(() => bind(wordlemodal, 'title', wordlemodal_title_binding));
    	binding_callbacks.push(() => bind(wordlemodal, 'subtitle', wordlemodal_subtitle_binding));

    	const block = {
    		c: function create() {
    			create_component(wordlemodal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wordlemodal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wordlemodal_changes = {};

    			if (dirty[0] & /*title*/ 2) wordlemodal_changes.titleColor = /*title*/ ctx[1] == 'Congratulations'
    			? 'text-success'
    			: 'text-danger';

    			if (dirty[0] & /*lightTheme*/ 32) wordlemodal_changes.backgroundColor = /*lightTheme*/ ctx[5] ? 'bg-info' : 'bg-black';

    			if (dirty[0] & /*rightWord, title*/ 18 | dirty[1] & /*$$scope*/ 131072) {
    				wordlemodal_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_openModal && dirty[0] & /*openModal*/ 1) {
    				updating_openModal = true;
    				wordlemodal_changes.openModal = /*openModal*/ ctx[0];
    				add_flush_callback(() => updating_openModal = false);
    			}

    			if (!updating_title && dirty[0] & /*title*/ 2) {
    				updating_title = true;
    				wordlemodal_changes.title = /*title*/ ctx[1];
    				add_flush_callback(() => updating_title = false);
    			}

    			if (!updating_subtitle && dirty[0] & /*subtitle*/ 4) {
    				updating_subtitle = true;
    				wordlemodal_changes.subtitle = /*subtitle*/ ctx[2];
    				add_flush_callback(() => updating_subtitle = false);
    			}

    			wordlemodal.$set(wordlemodal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wordlemodal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wordlemodal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wordlemodal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(272:2) {#if openModal && !modalName}",
    		ctx
    	});

    	return block;
    }

    // (283:43) 
    function create_if_block_4(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p1;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("???");
    			t1 = text(/*rightWord*/ ctx[4]);
    			t2 = text("???");
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "is the rightWord";
    			attr_dev(p0, "class", "text-success");
    			add_location(p0, file$1, 283, 8, 9246);
    			attr_dev(p1, "class", "text-success fw-normal");
    			add_location(p1, file$1, 284, 8, 9297);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*rightWord*/ 16) set_data_dev(t1, /*rightWord*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(283:43) ",
    		ctx
    	});

    	return block;
    }

    // (280:6) {#if title == 'Failed'}
    function create_if_block_3(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p1;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("???");
    			t1 = text(/*rightWord*/ ctx[4]);
    			t2 = text("???");
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "is the rightWord";
    			attr_dev(p0, "class", "text-success");
    			add_location(p0, file$1, 280, 8, 9086);
    			attr_dev(p1, "class", "text-success fw-normal");
    			add_location(p1, file$1, 281, 8, 9137);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*rightWord*/ 16) set_data_dev(t1, /*rightWord*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(280:6) {#if title == 'Failed'}",
    		ctx
    	});

    	return block;
    }

    // (273:4) <WordleModal        bind:openModal        bind:title        bind:subtitle        titleColor={title == 'Congratulations' ? 'text-success' : 'text-danger'}        backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}      >
    function create_default_slot_2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*title*/ ctx[1] == 'Failed') return create_if_block_3;
    		if (/*title*/ ctx[1] == 'Congratulations') return create_if_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(273:4) <WordleModal        bind:openModal        bind:title        bind:subtitle        titleColor={title == 'Congratulations' ? 'text-success' : 'text-danger'}        backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}      >",
    		ctx
    	});

    	return block;
    }

    // (289:2) {#if openModal && modalName == 'settings'}
    function create_if_block_1(ctx) {
    	let wordlemodal;
    	let updating_openModal;
    	let updating_title;
    	let updating_subtitle;
    	let updating_modalName;
    	let current;

    	function wordlemodal_openModal_binding_1(value) {
    		/*wordlemodal_openModal_binding_1*/ ctx[27](value);
    	}

    	function wordlemodal_title_binding_1(value) {
    		/*wordlemodal_title_binding_1*/ ctx[28](value);
    	}

    	function wordlemodal_subtitle_binding_1(value) {
    		/*wordlemodal_subtitle_binding_1*/ ctx[29](value);
    	}

    	function wordlemodal_modalName_binding(value) {
    		/*wordlemodal_modalName_binding*/ ctx[30](value);
    	}

    	let wordlemodal_props = {
    		backgroundColor: /*lightTheme*/ ctx[5] ? 'bg-info' : 'bg-black',
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*openModal*/ ctx[0] !== void 0) {
    		wordlemodal_props.openModal = /*openModal*/ ctx[0];
    	}

    	if (/*title*/ ctx[1] !== void 0) {
    		wordlemodal_props.title = /*title*/ ctx[1];
    	}

    	if (/*subtitle*/ ctx[2] !== void 0) {
    		wordlemodal_props.subtitle = /*subtitle*/ ctx[2];
    	}

    	if (/*modalName*/ ctx[6] !== void 0) {
    		wordlemodal_props.modalName = /*modalName*/ ctx[6];
    	}

    	wordlemodal = new WordleModal({ props: wordlemodal_props, $$inline: true });
    	binding_callbacks.push(() => bind(wordlemodal, 'openModal', wordlemodal_openModal_binding_1));
    	binding_callbacks.push(() => bind(wordlemodal, 'title', wordlemodal_title_binding_1));
    	binding_callbacks.push(() => bind(wordlemodal, 'subtitle', wordlemodal_subtitle_binding_1));
    	binding_callbacks.push(() => bind(wordlemodal, 'modalName', wordlemodal_modalName_binding));

    	const block = {
    		c: function create() {
    			create_component(wordlemodal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wordlemodal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wordlemodal_changes = {};
    			if (dirty[0] & /*lightTheme*/ 32) wordlemodal_changes.backgroundColor = /*lightTheme*/ ctx[5] ? 'bg-info' : 'bg-black';

    			if (dirty[0] & /*lightTheme*/ 32 | dirty[1] & /*$$scope*/ 131072) {
    				wordlemodal_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_openModal && dirty[0] & /*openModal*/ 1) {
    				updating_openModal = true;
    				wordlemodal_changes.openModal = /*openModal*/ ctx[0];
    				add_flush_callback(() => updating_openModal = false);
    			}

    			if (!updating_title && dirty[0] & /*title*/ 2) {
    				updating_title = true;
    				wordlemodal_changes.title = /*title*/ ctx[1];
    				add_flush_callback(() => updating_title = false);
    			}

    			if (!updating_subtitle && dirty[0] & /*subtitle*/ 4) {
    				updating_subtitle = true;
    				wordlemodal_changes.subtitle = /*subtitle*/ ctx[2];
    				add_flush_callback(() => updating_subtitle = false);
    			}

    			if (!updating_modalName && dirty[0] & /*modalName*/ 64) {
    				updating_modalName = true;
    				wordlemodal_changes.modalName = /*modalName*/ ctx[6];
    				add_flush_callback(() => updating_modalName = false);
    			}

    			wordlemodal.$set(wordlemodal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wordlemodal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wordlemodal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wordlemodal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(289:2) {#if openModal && modalName == 'settings'}",
    		ctx
    	});

    	return block;
    }

    // (290:4) <WordleModal        bind:openModal        bind:title        bind:subtitle        bind:modalName        backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}      >
    function create_default_slot_1(ctx) {
    	let toggle;
    	let updating_checkedValue;
    	let current;

    	function toggle_checkedValue_binding(value) {
    		/*toggle_checkedValue_binding*/ ctx[26](value);
    	}

    	let toggle_props = {
    		width: "5rem",
    		offColor: "white",
    		onColor: "black",
    		switchColor: "white",
    		swithBorderColor: "red"
    	};

    	if (/*lightTheme*/ ctx[5] !== void 0) {
    		toggle_props.checkedValue = /*lightTheme*/ ctx[5];
    	}

    	toggle = new Toggle({ props: toggle_props, $$inline: true });
    	binding_callbacks.push(() => bind(toggle, 'checkedValue', toggle_checkedValue_binding));

    	const block = {
    		c: function create() {
    			create_component(toggle.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(toggle, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const toggle_changes = {};

    			if (!updating_checkedValue && dirty[0] & /*lightTheme*/ 32) {
    				updating_checkedValue = true;
    				toggle_changes.checkedValue = /*lightTheme*/ ctx[5];
    				add_flush_callback(() => updating_checkedValue = false);
    			}

    			toggle.$set(toggle_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toggle.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toggle.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(toggle, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(290:4) <WordleModal        bind:openModal        bind:title        bind:subtitle        bind:modalName        backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}      >",
    		ctx
    	});

    	return block;
    }

    // (307:2) {#if openModal && modalName == 'rules'}
    function create_if_block(ctx) {
    	let wordlemodal;
    	let updating_openModal;
    	let updating_title;
    	let updating_subtitle;
    	let updating_modalName;
    	let current;

    	function wordlemodal_openModal_binding_2(value) {
    		/*wordlemodal_openModal_binding_2*/ ctx[31](value);
    	}

    	function wordlemodal_title_binding_2(value) {
    		/*wordlemodal_title_binding_2*/ ctx[32](value);
    	}

    	function wordlemodal_subtitle_binding_2(value) {
    		/*wordlemodal_subtitle_binding_2*/ ctx[33](value);
    	}

    	function wordlemodal_modalName_binding_1(value) {
    		/*wordlemodal_modalName_binding_1*/ ctx[34](value);
    	}

    	let wordlemodal_props = {
    		backgroundColor: /*lightTheme*/ ctx[5] ? 'bg-info' : 'bg-black',
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*openModal*/ ctx[0] !== void 0) {
    		wordlemodal_props.openModal = /*openModal*/ ctx[0];
    	}

    	if (/*title*/ ctx[1] !== void 0) {
    		wordlemodal_props.title = /*title*/ ctx[1];
    	}

    	if (/*subtitle*/ ctx[2] !== void 0) {
    		wordlemodal_props.subtitle = /*subtitle*/ ctx[2];
    	}

    	if (/*modalName*/ ctx[6] !== void 0) {
    		wordlemodal_props.modalName = /*modalName*/ ctx[6];
    	}

    	wordlemodal = new WordleModal({ props: wordlemodal_props, $$inline: true });
    	binding_callbacks.push(() => bind(wordlemodal, 'openModal', wordlemodal_openModal_binding_2));
    	binding_callbacks.push(() => bind(wordlemodal, 'title', wordlemodal_title_binding_2));
    	binding_callbacks.push(() => bind(wordlemodal, 'subtitle', wordlemodal_subtitle_binding_2));
    	binding_callbacks.push(() => bind(wordlemodal, 'modalName', wordlemodal_modalName_binding_1));

    	const block = {
    		c: function create() {
    			create_component(wordlemodal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wordlemodal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const wordlemodal_changes = {};
    			if (dirty[0] & /*lightTheme*/ 32) wordlemodal_changes.backgroundColor = /*lightTheme*/ ctx[5] ? 'bg-info' : 'bg-black';

    			if (dirty[1] & /*$$scope*/ 131072) {
    				wordlemodal_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_openModal && dirty[0] & /*openModal*/ 1) {
    				updating_openModal = true;
    				wordlemodal_changes.openModal = /*openModal*/ ctx[0];
    				add_flush_callback(() => updating_openModal = false);
    			}

    			if (!updating_title && dirty[0] & /*title*/ 2) {
    				updating_title = true;
    				wordlemodal_changes.title = /*title*/ ctx[1];
    				add_flush_callback(() => updating_title = false);
    			}

    			if (!updating_subtitle && dirty[0] & /*subtitle*/ 4) {
    				updating_subtitle = true;
    				wordlemodal_changes.subtitle = /*subtitle*/ ctx[2];
    				add_flush_callback(() => updating_subtitle = false);
    			}

    			if (!updating_modalName && dirty[0] & /*modalName*/ 64) {
    				updating_modalName = true;
    				wordlemodal_changes.modalName = /*modalName*/ ctx[6];
    				add_flush_callback(() => updating_modalName = false);
    			}

    			wordlemodal.$set(wordlemodal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wordlemodal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wordlemodal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wordlemodal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(307:2) {#if openModal && modalName == 'rules'}",
    		ctx
    	});

    	return block;
    }

    // (308:4) <WordleModal        bind:openModal        bind:title        bind:subtitle        bind:modalName        backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}      >
    function create_default_slot(ctx) {
    	let rules;
    	let current;
    	rules = new Rules({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(rules.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(rules, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rules.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rules.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(rules, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(308:4) <WordleModal        bind:openModal        bind:title        bind:subtitle        bind:modalName        backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}      >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div13;
    	let div2;
    	let div1;
    	let div0;
    	let i0;
    	let t0;
    	let span;
    	let t2;
    	let i1;
    	let t3;
    	let hr;
    	let hr_class_value;
    	let t4;
    	let div4;
    	let div3;
    	let t5;
    	let div6;
    	let div5;
    	let t6;
    	let div12;
    	let div7;
    	let each_blocks_2 = [];
    	let each2_lookup = new Map();
    	let t7;
    	let div8;
    	let each_blocks_1 = [];
    	let each3_lookup = new Map();
    	let t8;
    	let div11;
    	let each_blocks = [];
    	let each4_lookup = new Map();
    	let t9;
    	let div10;
    	let div9;
    	let i2;
    	let t10;
    	let t11;
    	let t12;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_4 = /*word*/ ctx[3];
    	validate_each_argument(each_value_4);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = falseArray;
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = charSet[0];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*i*/ ctx[42];
    	validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each2_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
    	}

    	let each_value_1 = charSet[1];
    	validate_each_argument(each_value_1);
    	const get_key_1 = ctx => /*i*/ ctx[42];
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key_1);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key_1(child_ctx);
    		each3_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = charSet[2];
    	validate_each_argument(each_value);
    	const get_key_2 = ctx => /*i*/ ctx[42];
    	validate_each_keys(ctx, each_value, get_each_context, get_key_2);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key_2(child_ctx);
    		each4_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let if_block0 = /*openModal*/ ctx[0] && !/*modalName*/ ctx[6] && create_if_block_2(ctx);
    	let if_block1 = /*openModal*/ ctx[0] && /*modalName*/ ctx[6] == 'settings' && create_if_block_1(ctx);
    	let if_block2 = /*openModal*/ ctx[0] && /*modalName*/ ctx[6] == 'rules' && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div13 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t0 = space();
    			span = element("span");
    			span.textContent = "WORDLE";
    			t2 = space();
    			i1 = element("i");
    			t3 = space();
    			hr = element("hr");
    			t4 = space();
    			div4 = element("div");
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t5 = space();
    			div6 = element("div");
    			div5 = element("div");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t6 = space();
    			div12 = element("div");
    			div7 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t7 = space();
    			div8 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t8 = space();
    			div11 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			div10 = element("div");
    			div9 = element("div");
    			i2 = element("i");
    			t10 = space();
    			if (if_block0) if_block0.c();
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(i0, "class", "fa-solid fa-circle-question pe-5 pt-3");
    			add_location(i0, file$1, 155, 8, 4854);
    			attr_dev(span, "class", "fw-bold fs-3");
    			add_location(span, file$1, 159, 8, 4975);
    			attr_dev(i1, "class", "fa-solid fa-gear ps-5 pt-3");
    			add_location(i1, file$1, 160, 8, 5025);
    			attr_dev(div0, "class", "d-flex ");
    			add_location(div0, file$1, 154, 6, 4823);
    			attr_dev(hr, "class", hr_class_value = "p-0 m-0 " + (/*lightTheme*/ ctx[5] ? 'bg-black' : 'bg-white') + " h-10 position-relative bottom-1 mx-2" + " svelte-15torbd");
    			add_location(hr, file$1, 163, 6, 5205);
    			add_location(div1, file$1, 153, 4, 4810);
    			attr_dev(div2, "class", "middle d-flex justify-content-center");
    			add_location(div2, file$1, 152, 2, 4754);
    			attr_dev(div3, "class", "row mb-1 row-cols-5 gx-2");
    			add_location(div3, file$1, 172, 4, 5424);
    			attr_dev(div4, "class", "w-25 mt-2 position-absolute left-50 svelte-15torbd");
    			add_location(div4, file$1, 171, 2, 5369);
    			attr_dev(div5, "class", "row mb-1 row-cols-5 gx-2");
    			add_location(div5, file$1, 186, 4, 5832);
    			attr_dev(div6, "class", "w-25 mt-2 position-absolute left-50 svelte-15torbd");
    			add_location(div6, file$1, 185, 2, 5777);
    			attr_dev(div7, "class", "row mb-1 row-cols-10 gx-2");
    			add_location(div7, file$1, 215, 4, 6779);
    			attr_dev(div8, "class", "row mb-1 mx-4 row-cols-9 gx-2");
    			add_location(div8, file$1, 232, 4, 7372);
    			attr_dev(i2, "class", "fas fa-backspace icon svelte-15torbd");
    			add_location(i2, file$1, 266, 10, 8698);
    			attr_dev(div9, "class", "border rounded h-2 w-100 d-flex justify-content-center svelte-15torbd");
    			add_location(div9, file$1, 265, 8, 8616);
    			attr_dev(div10, "class", "col my-1 c-p svelte-15torbd");
    			add_location(div10, file$1, 264, 6, 8536);
    			attr_dev(div11, "class", "row mb-1 row-cols-10 gx-2");
    			add_location(div11, file$1, 249, 4, 7972);
    			attr_dev(div12, "class", "w-50 mt-2 position-absolute left-50 bottom-0 svelte-15torbd");
    			add_location(div12, file$1, 213, 2, 6696);
    			attr_dev(div13, "class", "position-relative w-100 h-100 border fw-bolder svelte-15torbd");

    			set_style(div13, "background", /*lightTheme*/ ctx[5]
    			? 'var(--light-BackGround)'
    			: 'var(--dark-BackGround)');

    			set_style(div13, "color", /*lightTheme*/ ctx[5]
    			? 'var(--light-text)'
    			: 'var(--dark-text)');

    			add_location(div13, file$1, 145, 0, 4514);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, i0);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(div0, t2);
    			append_dev(div0, i1);
    			append_dev(div1, t3);
    			append_dev(div1, hr);
    			append_dev(div13, t4);
    			append_dev(div13, div4);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(div3, null);
    			}

    			append_dev(div13, t5);
    			append_dev(div13, div6);
    			append_dev(div6, div5);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div5, null);
    			}

    			append_dev(div13, t6);
    			append_dev(div13, div12);
    			append_dev(div12, div7);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div7, null);
    			}

    			append_dev(div12, t7);
    			append_dev(div12, div8);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div8, null);
    			}

    			append_dev(div12, t8);
    			append_dev(div12, div11);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div11, null);
    			}

    			append_dev(div11, t9);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, i2);
    			append_dev(div13, t10);
    			if (if_block0) if_block0.m(div13, null);
    			append_dev(div13, t11);
    			if (if_block1) if_block1.m(div13, null);
    			append_dev(div13, t12);
    			if (if_block2) if_block2.m(div13, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keydown", /*keydown_handler*/ ctx[16], false, false, false),
    					listen_dev(i0, "click", /*click_handler*/ ctx[17], false, false, false),
    					listen_dev(i1, "click", /*click_handler_1*/ ctx[18], false, false, false),
    					listen_dev(div10, "click", /*click_handler_5*/ ctx[22], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*lightTheme*/ 32 && hr_class_value !== (hr_class_value = "p-0 m-0 " + (/*lightTheme*/ ctx[5] ? 'bg-black' : 'bg-white') + " h-10 position-relative bottom-1 mx-2" + " svelte-15torbd")) {
    				attr_dev(hr, "class", hr_class_value);
    			}

    			if (dirty[0] & /*colors, word*/ 136) {
    				each_value_4 = /*word*/ ctx[3];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_4.length;
    			}

    			if (dirty[0] & /*onScreenKbHandeller, colorReturn, firstRowColors*/ 12544) {
    				each_value_2 = charSet[0];
    				validate_each_argument(each_value_2);
    				validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_2, each2_lookup, div7, destroy_block, create_each_block_2, null, get_each_context_2);
    			}

    			if (dirty[0] & /*onScreenKbHandeller, colorReturn, secondRowColors*/ 12800) {
    				each_value_1 = charSet[1];
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key_1);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_1, each3_lookup, div8, destroy_block, create_each_block_1, null, get_each_context_1);
    			}

    			if (dirty[0] & /*onScreenKbHandeller, colorReturn, thirdRowColors*/ 13312) {
    				each_value = charSet[2];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key_2);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_2, 1, ctx, each_value, each4_lookup, div11, destroy_block, create_each_block, t9, get_each_context);
    			}

    			if (/*openModal*/ ctx[0] && !/*modalName*/ ctx[6]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*openModal, modalName*/ 65) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div13, t11);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*openModal*/ ctx[0] && /*modalName*/ ctx[6] == 'settings') {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*openModal, modalName*/ 65) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div13, t12);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*openModal*/ ctx[0] && /*modalName*/ ctx[6] == 'rules') {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*openModal, modalName*/ 65) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div13, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*lightTheme*/ 32) {
    				set_style(div13, "background", /*lightTheme*/ ctx[5]
    				? 'var(--light-BackGround)'
    				: 'var(--dark-BackGround)');
    			}

    			if (!current || dirty[0] & /*lightTheme*/ 32) {
    				set_style(div13, "color", /*lightTheme*/ ctx[5]
    				? 'var(--light-text)'
    				: 'var(--dark-text)');
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div13);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d();
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Wordle', slots, []);
    	let openModal = false;
    	let title = '';
    	let subtitle = '';
    	let index = Math.floor(Math.random() * possibilities.length);
    	let word = "";
    	let keyColors = [];
    	let rightWord = possibilities[index].toUpperCase();
    	console.log(rightWord);
    	let nextCount = 5;
    	let lightTheme = false;
    	let modalName = "";

    	const keyboardHandeler = event => {
    		if (word.length < nextCount && word.length < 30 && event.keyCode >= 65 && event.keyCode <= 90 && !word.includes(rightWord)) {
    			$$invalidate(3, word = word + event.key.toUpperCase());
    		}

    		if (word.length != 0 && word.length % 5 == 0 && event.key == 'Enter') {
    			if (possibilities.includes(word.substring(word.length - 5, word.length).toLowerCase())) {
    				checkWord();
    				nextCount = word.length + 5;
    			} else {
    				$$invalidate(0, openModal = true);
    				$$invalidate(1, title = 'Attention');
    				$$invalidate(2, subtitle = 'Enter a Meaningfull Word');
    			}
    		}

    		if (event.key == 'Backspace' && nextCount - 5 != word.length) {
    			$$invalidate(3, word = word.substring(0, word.length - 1));
    		}
    	};

    	const onScreenKbHandeller = b => {
    		if (word.length < nextCount && word.length < 30 && b != 'bks' && b != 'reset' && b != 'Enter' && !word.includes(rightWord)) {
    			$$invalidate(3, word = word + b);
    		}

    		if (word.length != 0 && word.length % 5 == 0 && b == 'Enter') {
    			if (possibilities.includes(word.substring(word.length - 5, word.length).toLowerCase())) {
    				checkWord();
    				nextCount = word.length + 5;
    			} else {
    				$$invalidate(0, openModal = true);
    				$$invalidate(1, title = 'Attention');
    				$$invalidate(2, subtitle = 'Enter a Meaningfull Word');
    			}
    		}

    		if (b == 'bks' && nextCount - 5 != word.length) {
    			$$invalidate(3, word = word.substring(0, word.length - 1));
    		}

    		if (b == 'reset') {
    			$$invalidate(3, word = '');
    			nextCount = 5;
    			$$invalidate(7, colors = []);
    			keyColors = [];
    			$$invalidate(8, firstRowColors = []);
    			$$invalidate(9, secondRowColors = []);
    			$$invalidate(10, thirdRowColors = []);
    			index = Math.floor(Math.random() * possibilities.length);
    			$$invalidate(4, rightWord = possibilities[index].toUpperCase());
    			console.log(rightWord);
    		}
    	};

    	let colors = [];

    	const checkWord = () => {
    		$$invalidate(7, colors = []);
    		keyColors = [];

    		for (let i = 0; i < word.length; i++) {
    			if (rightWord[i % 5] == word[i]) {
    				colors.push('#538D4C');
    				keyColors.push({ char: word[i], color: '#538D4C' });
    			} else if (rightWord.includes(word[i])) {
    				colors.push(' #B4A037');
    				keyColors.push({ char: word[i], color: ' #B4A037' });
    			} else {
    				colors.push('#3A3A3C');
    				keyColors.push({ char: word[i], color: '#3A3A3C' });
    			}
    		}

    		$$invalidate(7, colors);
    		keyColorPerRow();

    		if (word.includes(rightWord)) {
    			$$invalidate(0, openModal = true);
    			$$invalidate(1, title = 'Congratulations');
    			$$invalidate(2, subtitle = 'You have guessed the word successfully');
    		}

    		if (!word.includes(rightWord) && word.length == 30) {
    			$$invalidate(0, openModal = true);
    			$$invalidate(1, title = 'Failed');
    			$$invalidate(2, subtitle = 'You have failed to guess the word');
    		}
    	};

    	let firstRowColors = [];
    	let secondRowColors = [];
    	let thirdRowColors = [];

    	const keyColorPerRow = () => {
    		$$invalidate(8, firstRowColors = []);
    		$$invalidate(9, secondRowColors = []);
    		$$invalidate(10, thirdRowColors = []);

    		for (let i = 0; i < word.length; i++) {
    			if (charSet[0].includes(keyColors[i].char)) {
    				firstRowColors.push({
    					char: keyColors[i].char,
    					color: keyColors[i].color
    				});
    			} else if (charSet[1].includes(keyColors[i].char)) {
    				secondRowColors.push({
    					char: keyColors[i].char,
    					color: keyColors[i].color
    				});
    			} else {
    				thirdRowColors.push({
    					char: keyColors[i].char,
    					color: keyColors[i].color
    				});
    			}
    		}

    		rowColorFilter(firstRowColors);
    		rowColorFilter(secondRowColors);
    		rowColorFilter(thirdRowColors);
    	};

    	const colorReturn = (item, row) => {
    		for (let i = 0; i < row.length; i++) {
    			if (row[i].char == item) {
    				return row[i].color;
    			}
    		}
    	};

    	const themeToggle = () => {
    		$$invalidate(0, openModal = true);
    		$$invalidate(6, modalName = "settings");
    		$$invalidate(1, title = "");
    		$$invalidate(2, subtitle = "Switch Mood");
    	};

    	const gameRules = () => {
    		$$invalidate(0, openModal = true);
    		$$invalidate(6, modalName = "rules");
    		$$invalidate(1, title = "");
    		$$invalidate(2, subtitle = "How to Play?");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Wordle> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = event => keyboardHandeler(event);
    	const click_handler = () => gameRules();
    	const click_handler_1 = () => themeToggle();
    	const click_handler_2 = item => onScreenKbHandeller(item);
    	const click_handler_3 = item => onScreenKbHandeller(item);
    	const click_handler_4 = item => onScreenKbHandeller(item);
    	const click_handler_5 = () => onScreenKbHandeller('bks');

    	function wordlemodal_openModal_binding(value) {
    		openModal = value;
    		$$invalidate(0, openModal);
    	}

    	function wordlemodal_title_binding(value) {
    		title = value;
    		$$invalidate(1, title);
    	}

    	function wordlemodal_subtitle_binding(value) {
    		subtitle = value;
    		$$invalidate(2, subtitle);
    	}

    	function toggle_checkedValue_binding(value) {
    		lightTheme = value;
    		$$invalidate(5, lightTheme);
    	}

    	function wordlemodal_openModal_binding_1(value) {
    		openModal = value;
    		$$invalidate(0, openModal);
    	}

    	function wordlemodal_title_binding_1(value) {
    		title = value;
    		$$invalidate(1, title);
    	}

    	function wordlemodal_subtitle_binding_1(value) {
    		subtitle = value;
    		$$invalidate(2, subtitle);
    	}

    	function wordlemodal_modalName_binding(value) {
    		modalName = value;
    		$$invalidate(6, modalName);
    	}

    	function wordlemodal_openModal_binding_2(value) {
    		openModal = value;
    		$$invalidate(0, openModal);
    	}

    	function wordlemodal_title_binding_2(value) {
    		title = value;
    		$$invalidate(1, title);
    	}

    	function wordlemodal_subtitle_binding_2(value) {
    		subtitle = value;
    		$$invalidate(2, subtitle);
    	}

    	function wordlemodal_modalName_binding_1(value) {
    		modalName = value;
    		$$invalidate(6, modalName);
    	}

    	$$self.$capture_state = () => ({
    		Rules,
    		Toggle,
    		WordleModal,
    		possibilities,
    		charSet,
    		falseArray,
    		rowColorFilter,
    		openModal,
    		title,
    		subtitle,
    		index,
    		word,
    		keyColors,
    		rightWord,
    		nextCount,
    		lightTheme,
    		modalName,
    		keyboardHandeler,
    		onScreenKbHandeller,
    		colors,
    		checkWord,
    		firstRowColors,
    		secondRowColors,
    		thirdRowColors,
    		keyColorPerRow,
    		colorReturn,
    		themeToggle,
    		gameRules
    	});

    	$$self.$inject_state = $$props => {
    		if ('openModal' in $$props) $$invalidate(0, openModal = $$props.openModal);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(2, subtitle = $$props.subtitle);
    		if ('index' in $$props) index = $$props.index;
    		if ('word' in $$props) $$invalidate(3, word = $$props.word);
    		if ('keyColors' in $$props) keyColors = $$props.keyColors;
    		if ('rightWord' in $$props) $$invalidate(4, rightWord = $$props.rightWord);
    		if ('nextCount' in $$props) nextCount = $$props.nextCount;
    		if ('lightTheme' in $$props) $$invalidate(5, lightTheme = $$props.lightTheme);
    		if ('modalName' in $$props) $$invalidate(6, modalName = $$props.modalName);
    		if ('colors' in $$props) $$invalidate(7, colors = $$props.colors);
    		if ('firstRowColors' in $$props) $$invalidate(8, firstRowColors = $$props.firstRowColors);
    		if ('secondRowColors' in $$props) $$invalidate(9, secondRowColors = $$props.secondRowColors);
    		if ('thirdRowColors' in $$props) $$invalidate(10, thirdRowColors = $$props.thirdRowColors);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		openModal,
    		title,
    		subtitle,
    		word,
    		rightWord,
    		lightTheme,
    		modalName,
    		colors,
    		firstRowColors,
    		secondRowColors,
    		thirdRowColors,
    		keyboardHandeler,
    		onScreenKbHandeller,
    		colorReturn,
    		themeToggle,
    		gameRules,
    		keydown_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		wordlemodal_openModal_binding,
    		wordlemodal_title_binding,
    		wordlemodal_subtitle_binding,
    		toggle_checkedValue_binding,
    		wordlemodal_openModal_binding_1,
    		wordlemodal_title_binding_1,
    		wordlemodal_subtitle_binding_1,
    		wordlemodal_modalName_binding,
    		wordlemodal_openModal_binding_2,
    		wordlemodal_title_binding_2,
    		wordlemodal_subtitle_binding_2,
    		wordlemodal_modalName_binding_1
    	];
    }

    class Wordle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Wordle",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.4 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let wordle;
    	let current;
    	wordle = new Wordle({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(wordle.$$.fragment);
    			attr_dev(main, "class", "svelte-kbvcn3");
    			add_location(main, file, 3, 0, 69);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(wordle, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wordle.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wordle.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(wordle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Wordle });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
