// create a higher-order function to be called on every transition call in response to UI events (clicks, ajax responses, promise resolutions e.t.c)

const transitionFunctionFactory = (
  actionDispatcher,
  transitionGraph,
  transitionRuleSet,
  initialState
) => (eventName, behaviourState, action) => {
  // checking if argument passed is "null" or "undefined" and setting a default
  if (behaviourState === void 0) {
    behaviourState = initialState;
  }

  let transitionSet = transitionGraph[behaviourState.current];
  let newBehaviourState = transitionSet[eventName];
  
  // state-charts have guards and we need to execute that
  if (!newBehaviourState) {
    throw new Error("Action call on current state invalid");
  }
  
  let transitionRule = transitionRuleSet[newBehaviourState.current];
  let subState = null;
  let _parallelState = null;
  let _nextState = newBehaviourState.current || newBehaviourState;
  // let nextTransitionSet = transitionGraph[_nextState];

  if (_nextState.indexOf(".") + 1) {
    let hierachies = _nextState.split(".");
    _nextState = hierachies.shift();
    subState = hierachies.shift();
  }

  if (newBehaviourState.parallel) {
    _parallelState = newBehaviourState.parallel;
  } else {
    _parallelState = behaviourState.parallel;
  }

  if (transitionRule && transitionRule["_action"] !== null) {
    let newAction = action;
    let type = transitionRule["_action"];
    let actionGuard = transitionRule["_guard"];

    if (typeof action != "function") {
      /*if(typeof actionGuard === 'function'){
				actionGuard( action );
			}*/
      newAction.type = type;
    } else {
      newAction = function(dispatch, getState) {
        return action(dispatch, getState, actionGuard, type);
      };
    }

    actionDispatcher(newAction);
  }

  return {
    current: _nextState,
    sub: subState,
    parallel: _parallelState
  };
};

const updateAppBehavior = (context, behavior) => {
  context.setState(behavior);
};

export { updateAppBehavior, transitionFunctionFactory };
