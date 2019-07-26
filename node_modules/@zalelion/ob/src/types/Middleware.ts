import { Observer } from "../Observer";

export type GetMiddle = (argv: {
  root: any;
  path: string;
  parentPath:string;
  parent: any;
  key: string;
  value: any;
  ob: Observer<any>;
}) => any;

export type BeforeSetMiddle = (argv: {
  root: any;
  path: string;
  parentPath:string;
  parent: any;
  key: string;
  value: any;
  newValue: any;
  ob: Observer<any>;
}) => any;

export type AfterSetMiddle = (argv: {
  root: any;
  path: string;
  parentPath:string;
  parent: any;
  key: string;
  value: any;
  newValue: any;
  ob: Observer<any>;
}) => void;

export type BeforeApplyMiddle = (argv: {
  root: any;
  path: string;
  parentPath:string;
  parent: any;
  fn: any;
  isNative: boolean;
  isArray: boolean;
  key: string;
  argv: any[];
  newArgv: any[];
  ob: Observer<any>;
}) => any[];

export type AfterApplyMiddle = (argv: {
  root: any;
  path: string;
  parentPath:string;
  parent: any;
  fn: any;
  key: string;
  isNative: boolean;
  isArray: boolean;
  argv: any[];
  newArgv: any[];
  result: any;
  newResult: any;
  ob: Observer<any>;
}) => any;

export type BeforeDeleteMiddele = (argv: {
  root: any;
  path: string;
  parentPath:string;
  key: string;
  parent: any;
  ob: Observer<any>;
}) => boolean;

export type AfterDeleteMiddle = (argv: {
  root: any;
  path: string;
  parentPath:string;
  key: string;
  parent: any;
  ob: Observer<any>;
}) => void;

export interface Middleware {
  get?: GetMiddle;
  beforeSet?: BeforeSetMiddle;
  afterSet?: AfterSetMiddle;
  beforeApply?: BeforeApplyMiddle;
  afterApply?: AfterApplyMiddle;
  beforeDelete?: BeforeDeleteMiddele;
  afterDelete?: AfterDeleteMiddle;
}
