// llm-worker.js — WebLLM inference worker
// Hosts an MLC LLM engine in a Web Worker so inference runs off the main thread.
// Loaded as module worker: new Worker('llm-worker.js', {type:'module'})

import { MLCEngine, WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm";

const engine = new MLCEngine();
const handler = new WebWorkerMLCEngineHandler(engine);
self.onmessage = (msg) => { try { handler.onmessage(msg); } catch (err) { self.postMessage({ type: 'error', msg: err.message || String(err) }); } };
