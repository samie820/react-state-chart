import { transitionFunctionFactory } from "./transition_factory_redux.js";
import { createStore, applyMiddleware } from "redux";

const thunkMiddleware = ({ dispatch, getState }) => next => action => {
  if (typeof action === "function") {
    return action(dispatch, getState);
  }

  return next(action);
};

const loggerMiddleware = ({ getState }) => next => action => {
  console.log("PREV: ", getState());
  next(action);
  console.log("NEXT: ", getState());
};

// create the [ actionDispatcher ] - redux store { no middlewares - for now }
const store = createStore(
  (state, action) => {
    switch (action.type) {
      case "MAKE_ENTRY":
        return Object.assign({}, state, {
          search_items: action.data
        });
      default:
        return state;
    }
  },
  { text: "", search_items: [] },
  applyMiddleware(thunkMiddleware, loggerMiddleware)
);

/**
  state transition diagram ( maps to the statechart graph below )
  
                                  ------------------> [ canceled ]
                                  |
      [ idle ] -----------> [ searching ] ----------> [ searched { success / error } ] ---
        ^                                                                                |
        |---------------------------------------------------------------------------------
*/

const statechart_transition_graph = {
  idle: {
    QUERY_BUTTON_CLICK: {
      current: "searching", // user action: buttonClick( event )
      parallel: { form: "loading" } //
    }
  },
  searching: {
    AJAX_RESPONSE_SUCCESS: "searched.success", // promise callback: asyncTaskDone( errorObj )
    AJAX_RESPONSE_ERROR: "searched.error", // promise callback: asyncTaskDone( errorObj )
    AJAX_ABORT_BUTTON_CLICK: "canceled" // user action: buttonClick( event )
  },
  searched: {
    RENDER_START: {
      current: "idle", // render ui: hasScreenData( void )
      parallel: { form: "ready" } //
    }
  },
  canceled: {
    RENDER_START: {
      current: "idle", // render ui: hasScreenData( void )
      parallel: { form: "ready" } //
    }
  },
  form: {}
};

// these are the rules that guide each transition

const statechart_transition_ruleset = {
  searching: {
    _guard: function(action) {
      return action.text.length > 0;
    }, // there is a guard for this transition
    _action: "MAKE_ENTRY" // calls redux reducer
  },
  searched: {
    _guard: false, // there is no guard for this transition
    _action: null, // doesn't call redux reducer
    _history: "searched.$history" //
  },
  idle: {
    _guard: false,
    _action: null
  },
  canceled: {
    _guard: false,
    _action: null
  }
};

const dispatch = store.dispatch.bind(store);
const subscribe = store.subscribe.bind(store);
const getState = store.getState.bind(store);

const transitionFunction = transitionFunctionFactory(
  dispatch,
  statechart_transition_graph,
  statechart_transition_ruleset,
  { current: "idle", sub: null, parallel: { form: "ready" }, error:null }
);

export { transitionFunction, subscribe, getState };
