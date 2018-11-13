import React, { Component } from "react";
import axios from "axios";
import { updateAppBehavior } from "./transition_factory_redux.js";
import {
  transitionFunction,
  getState,
  subscribe
} from "./setup_transition_function.js";
import './App.css';

const asyncFetchAction = (Component, action) => {
  const CancelToken = axios.CancelToken;

  return (dispatch, getState, actionGuard, actionType) => {
    const source = CancelToken.source();
    const storeDispatch = function(dataOrError) {
      setTimeout(() => {
        dispatch(action);
      }, 0);
    };

    action.type = actionType;

    Component.setCancelTokenCallback(function(msg) {
      source.cancel(msg);
    });

    if (actionGuard(action)) {
      return axios
        .get("https://jsonplaceholder.typicode.com/" + action.text, {
          cancelToken: source.token
        })
        .then(data => {
          action.data = data.data instanceof Array ? data.data : JSON.parse(data); // ["number-1", "number-2", "number-3"];
          Component.asyncTaskDone();
          return action
        })
        .then(storeDispatch)
        .catch(thrownError => {
          action.type = "";
          throw Component.asyncTaskDone(thrownError);
        })
        .catch(storeDispatch);
    }

  };
};

class App extends Component {
  constructor(props) {
    super(props);
    subscribe(this.hasScreenData);
    this.requestCancelCallback = null;
    this.state = {
      current: "idle",
      sub: null,
      parallel: { form: "ready" }
    };
  }

  buttonClick = event => {
    const _behavior = transitionFunction(
      event.target.name === "search"
        ? "QUERY_BUTTON_CLICK"
        : "AJAX_ABORT_BUTTON_CLICK",
      this.state,
      event.target.name === "search"
        ? asyncFetchAction(this, {
            text: event.target.form.elements["query"].value
          })
        : null
    );

    if (event.target.name === "cancel") {
      this.runCancelTokenCallback("User canceled request");
    }

    this.updateUI(_behavior); // update UI to show "loading"
  };

  asyncTaskDone = (thrownError) => {
    const _behavior = transitionFunction(
      thrownError ? "AJAX_RESPONSE_ERROR" : "AJAX_RESPONSE_SUCCESS",
      this.state,
      null,
      thrownError
    );

    this.updateUI(_behavior); // update UI to show "sucess/error"

    return thrownError ? thrownError : true;
  }

  runCancelTokenCallback(msg) {
    if (typeof this.requestCancelCallback == "function") {
      this.requestCancelCallback(msg);
    }
  }

  setCancelTokenCallback(callback) {
    this.requestCancelCallback = callback;
  }

  updateUI = stateObject => {
    return updateAppBehavior(this, stateObject); // this call always calls `render()` cos `setState()` gets called
  };

  hasScreenData = () => {
    const _behavior = transitionFunction(
      "RENDER_START",
      this.state,
      null,
      null
    );

    this.updateUI(_behavior);
  };

  renderInput(p, s) {
    if (s.parallel.form === "loading") {
      return <input type="text" name="query" readOnly="readOnly" />;
    }
    return <input type="text" name="query" />;
  }

  renderSearchButton(p, s) {
    return s.parallel.form === "loading" ? (
      <button
        type="button"
        name="search"
        onClick={this.buttonClick}
        disabled="disabled"
      >
        Searching...
      </button>
    ) : (
      <button type="button" name="search" onClick={this.buttonClick.bind(this)}>
        Search
      </button>
    );
  }

  renderCancelButton(p, s) {
    return s.current === "idle" ? (
      <button
        type="button"
        name="cancel"
        onClick={this.buttonClick}
        disabled="disabled"
      >
        Cancel
      </button>
    ) : s.current === "canceled" ? (
      <button type="button" name="cancel" onClick={this.buttonClick.bind(this)}>
        Canceling...
      </button>
    ) : (
      <button type="button" name="cancel" onClick={this.buttonClick.bind(this)}>
        Cancel
      </button>
    );
  }

  renderList(p) {
    return (
      <ul>
        {p.search_items.map(item => (
          <li>{item.title} <strong>{item.completed ? "😉" : "😑"}</strong></li>
        ))}
        ;
      </ul>
    );
  }

  renderLoadingMessage() {
    return (
      <p>
        <span>Loading Search Results...</span>
      </p>
    );
  }

  renderResult(p, s) {
    return s.parallel.form === "loading"
      ? this.renderLoadingMessage()
      : this.renderList(p);
  }

  render() {
    const _props = getState();
    return (
      <div>
        <form
          name="search"
          onSubmit={e => {
            return false;
          }}
        >
          {this.renderInput(_props, this.state)}
          {this.renderSearchButton(_props, this.state)}
          {this.renderCancelButton(_props, this.state)}
        </form>
        {this.renderResult(_props, this.state)}
      </div>
    );
  }
}

export default App;
