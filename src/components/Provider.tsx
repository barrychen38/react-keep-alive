import React from 'react';
import ReactDOM from 'react-dom';
import Comment from './Comment';
import KeepAliveContext from '../contexts/KeepAliveContext';
import createEventEmitter from '../utils/createEventEmitter';
import createUniqueIdentification from '../utils/createUniqueIdentification';
import createStoreElement from '../utils/createStoreElement';

export const keepAliveProviderTypeName = 'KeepAliveProvider';
export const START_MOUNTING_DOM = 'startMountingDOM';

export enum LIFECYCLE {
  MOUNTED,
  UPDATING,
  UNMOUNTED,
}

export interface ICacheItem {
  children: React.ReactNode;
  keepAlive: boolean;
  lifecycle: LIFECYCLE;
  key?: string | null;
  renderElement?: HTMLElement;
  activated?: boolean;
  ifStillActivate?: boolean;
  reactivate?: () => void;
}

export interface ICache {
  [key: string]: ICacheItem;
}

export interface IKeepAliveProviderImpl {
  storeElement: HTMLElement;
  cache: ICache;
  keys: string[];
  eventEmitter: any;
  existed: boolean;
  providerIdentification: string;
  setCache: (identification: string, value: ICacheItem) => void;
  unactivate: (identification: string) => void;
  isExisted: () => boolean;
}

export interface IKeepAliveProviderProps {
  include?: string | string[] | RegExp;
  exclude?: string | string[] | RegExp;
}

// TODO: include max exclude
export default class KeepAliveProvider extends React.PureComponent<IKeepAliveProviderProps> implements IKeepAliveProviderImpl {
  public static displayName = keepAliveProviderTypeName;

  public storeElement = createStoreElement();

  // Sometimes data that changes with setState cannot be synchronized, so force refresh
  public cache: ICache = Object.create(null);

  public keys: string[] = [];

  public eventEmitter = createEventEmitter();

  public existed: boolean = true;

  private needRerender: boolean = false;

  public providerIdentification: string = createUniqueIdentification();

  public componentDidUpdate() {
    if (this.needRerender) {
      this.needRerender = false;
      this.forceUpdate();
    }
  }

  public componentWillUnmount() {
    this.eventEmitter.clear();
    this.existed = false;
    document.body.removeChild(this.storeElement);
  }

  public isExisted = () => {
    return this.existed;
  }

  public setCache = (identification: string, value: ICacheItem) => {
    const {cache, keys} = this;
    const currentCache = cache[identification];
    const key = currentCache && currentCache.key;
    if (key && value.key && key !== (value.key as unknown)) {
      throw new Error('Cached components have duplicates.');
    }
    if (!currentCache) {
      keys.push(identification);
    }
    this.cache[identification] = {
      ...currentCache,
      ...value,
    };
    this.forceUpdate();
  }

  // private getMax = () => {
  //   return this.props.max ? parseInt(this.props.max) : null;
  // }

  // private shiftKey = () => {
  //   const max = this.getMax();
  //   const {keys, cache} = this;
  //   if (!max || keys.length <= max) {
  //     return;
  //   }
  //   for (let i = 0; i < keys.length; i++) {
  //     const key = keys[i];
  //     const currentCache = cache[key];
  //     if (currentCache && !currentCache.activated) {
  //       keys.splice(i, 1);
  //       delete cache[key];
  //       return;
  //     }
  //   }
  // }

  public unactivate = (identification: string) => {
    const {cache} = this;
    this.cache[identification] = {
      ...cache[identification],
      key: null,
      activated: false,
      lifecycle: LIFECYCLE.UNMOUNTED,
    };
    this.forceUpdate();
  }

  private startMountingDOM = (identification: string) => {
    this.eventEmitter.emit([identification, START_MOUNTING_DOM]);
  }

  public render() {
    const {
      cache,
      keys,
      providerIdentification,
      isExisted,
      setCache,
      unactivate,
      storeElement,
      eventEmitter,
    } = this;
    const {
      children: innerChildren,
      include,
      exclude,
    } = this.props;
    return (
      <KeepAliveContext.Provider
        value={{
          cache,
          providerIdentification,
          isExisted,
          setCache,
          unactivate,
          storeElement,
          eventEmitter,
          include,
          exclude,
        }}
      >
        <React.Fragment>
          {innerChildren}
          {
            keys.map(identification => {
              const currentCache = cache[identification];
              const {
                keepAlive,
                children,
                lifecycle,
              } = currentCache;
              let cacheChildren = children;
              if (lifecycle === LIFECYCLE.MOUNTED && !keepAlive) {
                // If the cache was last enabled, then the components of this keepAlive package are used,
                // and the cache is not enabled, the UI needs to be reset.
                cacheChildren = null;
                this.needRerender = true;
                currentCache.lifecycle = LIFECYCLE.UPDATING;
              }
              // current true, previous true | undefined, keepAlive false, not cache
              // current true, previous true | undefined, keepAlive true, cache

              // current true, previous false, keepAlive true, cache
              // current true, previous false, keepAlive false, not cache
              return ReactDOM.createPortal(
                (
                  cacheChildren
                    ? (
                      <React.Fragment>
                        <Comment>{identification}</Comment>
                        {cacheChildren}
                        <Comment
                          onLoaded={() => this.startMountingDOM(identification)}
                        >{identification}</Comment>
                      </React.Fragment>
                    )
                    : null
                ),
                storeElement,
              );
            })
          }
        </React.Fragment>
      </KeepAliveContext.Provider>
    );
  }
}