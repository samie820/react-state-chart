import React, { Component } from "react";
import axios from "axios";
import { updateAppBehavior } from "./transition_factory_redux.js";
import {
  transitionFunction,
  getState,
  subscribe
} from "./setup_transition_function.js";

const asyncFetchAction = (Component, action) => {
  const CancelToken = axios.CancelToken;

  return (dispatch, getState, actionGuard, actionType) => {
    const source = CancelToken.source();
    let promise = null;

    action.type = actionType;

    Component.setCancelTokenCallback(function(msg) {
      source.cancel(msg);
    });

    if (actionGuard(action)) {
      promise = axios
        .get("https://example.com?query=" + action.text, {
          cancelToken: source.token
        })
        .then(data => {
          action.data = ["number-1", "number-2", "number-3"];
          dispatch(action);
        })
        .catch(thrownError => {
          action.data = [];
          dispatch(action);
        });
    }

    return promise;
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

  buttonClick = (event) => {
    const _behavior = transitionFunction(
      event.target.name === "search"
        ? "QUERY_BUTTON_CLICK"
        : "AJAX_ABORT_BUTTON_CLICK",
      this.state,
      event.target.name === "search"
        ? asyncFetchAction(this, {
            text: event.target.form.elements["query"].value,
          })
        : null
    );

    if (event.target.name === "cancel") {
      this.runCancelTokenCallback("User canceled request");
    }

    this.updateUI(_behavior); // update UI to show "loading"
  }

  runCancelTokenCallback(msg) {
    if (typeof this.requestCancelCallback == "function") {
      this.requestCancelCallback(msg);
    }
  }

  setCancelTokenCallback(callback) {
    this.requestCancelCallback = callback;
  }

  updateUI = (stateObject) => {
    return updateAppBehavior(this, stateObject); // this call always calls `render()` cos `setState()` gets called
  }

  hasScreenData = () => {
    const _behavior = transitionFunction(
      "RENDER_START",
      this.state,
      null,
      null
    );

    this.updateUI(_behavior);
  }

  renderInput(p, s) {
    if (s.parallel.form === "loading") {
      return (
        <input type="text" name="query" readonly="readonly" />
      );
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
        {p.search_items.map((item) =>
        <li>{item}</li>
        )};
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
