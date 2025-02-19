import { Environment, ConditionalReference } from 'glimmer-runtime';
import { get } from 'ember-metal/property_get';
import Dict from 'ember-metal/empty_object';
import { toBool as emberToBool } from './helpers/if-unless';
import { CurlyComponentSyntax, CurlyComponentDefinition } from './components/curly-component';
import lookupComponent from './utils/lookup-component';

// @implements PathReference
export class RootReference {
  constructor(value) {
    this._value = value;
  }

  value() {
    return this._value;
  }

  isDirty() {
    return true;
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {
  }
}

// @implements PathReference
class PropertyReference {
  constructor(parentReference, propertyKey) {
    this._parentReference = parentReference;
    this._propertyKey = propertyKey;
  }

  value() {
    return get(this._parentReference.value(), this._propertyKey);
  }

  isDirty() {
    return true;
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {
  }
}

import { default as concat } from './helpers/concat';

const helpers = {
  concat
};

class EmberConditionalReference extends ConditionalReference {
  toBool(predicate) {
    return emberToBool(predicate);
  }
}

export default class extends Environment {
  constructor({ dom, owner }) {
    super(dom);
    this.owner = owner;
    this._components = new Dict();
  }

  refineStatement(statement) {
    let {
      isSimple,
      isInline,
      isBlock,
      key,
      path,
      args,
      templates
    } = statement;

    if (isSimple && (isInline || isBlock) && key.indexOf('-') >= 0) {
      let definition = this.getComponentDefinition(path);

      if (definition) {
        return new CurlyComponentSyntax({ args, definition, templates });
      }
    }

    return super.refineStatement(statement);
  }

  hasComponentDefinition() {
    return false;
  }

  getComponentDefinition(name) {
    let definition = this._components[name];

    if (!definition) {
      let { component: ComponentClass, layout } = lookupComponent(this.owner, name[0]);

      if (ComponentClass || layout) {
        definition = this._components[name] = new CurlyComponentDefinition(name, ComponentClass, layout);
      }
    }

    return definition;
  }

  hasHelper(name) {
    if (typeof helpers[name[0]] === 'function') {
      return true;
    } else {
      return this.owner.hasRegistration(`helper:${name}`);
    }
  }

  lookupHelper(name) {
    if (typeof helpers[name[0]] === 'function') {
      return helpers[name[0]];
    } else {
      let helper = this.owner.lookup(`helper:${name}`);

      if (helper && helper.isHelperInstance) {
        return helper.compute;
      } else if (helper && helper.isHelperFactory) {
        throw new Error(`Not implemented: ${name} is a class-based helpers`);
      } else {
        throw new Error(`${name} is not a helper`);
      }
    }
  }

  rootReferenceFor(value) {
    return new RootReference(value);
  }

  toConditionalReference(reference) {
    return new EmberConditionalReference(reference);
  }
}
