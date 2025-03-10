"use client"
import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import clone from "just-clone";
import type z from "zod";

type FormAction<T> = { type: "NEXT_STEP" } | { type: "PREVIOUS_STEP" } | {type: "MUTATE_DATA", payload: Partial<T>};

type FormState<T> = {
  currentStep: number;
  data: T;
};

type FormContextType<T> = {
  state: FormState<T>;
  nextStep: () => void;
  previousStep: () => void;
  mutateData: (data: Partial<T>) => void;
};


function createMultiStepFormContext<T>(payloadSchema: z.AnyZodObject) {
  const FormContext = createContext<FormContextType<T> | undefined>(undefined);

  function formReducer(
    state: FormState<T>,
    action: FormAction<T>
  ): FormState<T> {
    switch (action.type) {
      case "NEXT_STEP":
        return {
          ...state,
          currentStep: state.currentStep + 1,
        };
      case "PREVIOUS_STEP":
        return {
          ...state,
          currentStep: state.currentStep - 1,
        };
      case "MUTATE_DATA":
        return {
          ...state,
          data: {...state.data, ...action.payload}
        }
      default:
        return state;
    }
  }

  function FormProvider({ children } : {children: React.ReactNode}) {
    const initialData = useMemo(() => init(payloadSchema) as T, []);
    const [state, dispatch] = useReducer(formReducer,{currentStep: 0,data: initialData});

    const nextStep = useCallback(() => {
      dispatch({ type: "NEXT_STEP" });  
    }, []);

    const previousStep = useCallback(() => {
        dispatch({ type: "PREVIOUS_STEP" });
      }, []);

    const mutateData = useCallback((data: Partial<T>) => {
      dispatch({type: "MUTATE_DATA", payload: data});
    },[]);
    const value : FormContextType<T> = {
        state,
        nextStep,
        previousStep,
        mutateData
    };

    return <FormContext.Provider value={value}>{children}</FormContext.Provider>
  }

  function useMultiStepForm() {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error("useMultiStepForm must be used within a FormProvider");
    }
    return context;
  }

  return {FormProvider, useMultiStepForm}
}



export function withMultiStepForm<T>(payloadSchema: z.AnyZodObject){
    return createMultiStepFormContext<T>(payloadSchema);
}




// utility for parsing zod object default values
// copied from https://github.com/toiroakr/zod-empty/blob/main/src/index.ts
export function init<T extends z.ZodFirstPartySchemaTypes>(
  schema: T,
): z.output<T> {
  const def = schema._def;
  if (
    !("coerce" in def && def.coerce) &&
    schema.isNullable() &&
    def.typeName !== "ZodDefault"
  ) {
    return null;
  }

  switch (def.typeName) {
    case "ZodObject": {
      const outputObject: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(def.shape())) {
        outputObject[key] = init(value as z.ZodFirstPartySchemaTypes);
      }
      return outputObject;
    }
    case "ZodRecord":
      return {};
    case "ZodString": {
      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === "uuid") {
            return crypto.randomUUID();
          }
        }
      }
      return "";
    }
    case "ZodNumber":
      for (const check of def.checks || []) {
        if (check.kind === "max" || check.kind === "min") {
          return check.value;
        }
      }
      return 0;
    case "ZodBigInt":
      return BigInt(0);
    case "ZodBoolean":
      return false;
    case "ZodDate":
      return new Date();
    case "ZodLiteral":
      return def.value;
    case "ZodEffects":
      return init(def.schema);
    case "ZodArray":
      return [];
    case "ZodTuple":
      return def.items.map((item: z.ZodTypeAny) => init(item));
    case "ZodSet":
      return new Set();
    case "ZodMap":
      return new Map();
    case "ZodEnum":
      return def.values[0];
    case "ZodNativeEnum":
      // ref. https://github.com/colinhacks/zod/blob/6fe152f98a434a087c0f1ecbce5c52427bd816d3/src/helpers/util.ts#L28-L43
      return Object.values(def.values).filter(
        (value) => typeof def.values[value as any] !== "number",
      )[0];
    case "ZodUnion":
      return init(def.options[0]);
    case "ZodDiscriminatedUnion":
      return init(Array.from(def.options.values() as any[])[0]);
    case "ZodIntersection":
      return Object.assign(init(def.left) as any, init(def.right));
    case "ZodFunction":
      return (..._: any[]) => init(def.returns);
    case "ZodLazy":
      return init(def.getter());
    case "ZodPipeline":
      return init(def.in);
    case "ZodDefault":
      return def.innerType._def.typeName === "ZodFunction"
        ? def.defaultValue()
        : clone(def.defaultValue());
    case "ZodNaN":
      return Number.NaN;
    case "ZodNull":
    case "ZodAny":
      return null;
    case "ZodOptional":
      return init(def.innerType);
    // case "ZodUndefined":
    // case "ZodVoid":
    // case "ZodUnknown":
    // case "ZodNever":
    default:
      return undefined;
  }
}

export function empty<T extends z.ZodFirstPartySchemaTypes>(
  schema: T,
): z.input<T> {
  const def = schema._def;
  switch (def.typeName) {
    case "ZodObject": {
      const outputObject: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(def.shape())) {
        outputObject[key] = empty(value as z.ZodTypeAny);
      }
      return outputObject;
    }
    case "ZodRecord":
      return {};
    case "ZodArray":
      return [];
    case "ZodTuple":
      return def.items.map((item: z.ZodTypeAny) => empty(item));
    case "ZodSet":
      return new Set();
    case "ZodMap":
      return new Map();
    case "ZodUnion":
      return empty(def.options[0]);
    case "ZodDiscriminatedUnion":
      return empty(Array.from(def.options.values() as any[])[0]);
    case "ZodIntersection":
      return Object.assign(empty(def.left) as any, empty(def.right));
    case "ZodLazy":
      return empty(def.getter());
    case "ZodPipeline":
      return empty(def.in);
    case "ZodNullable":
    case "ZodOptional":
      return empty(def.innerType);
    case "ZodEffects":
      return empty(def.schema);
    case "ZodLiteral":
      return def.value;
    case "ZodNaN":
      return Number.NaN;
    case "ZodDefault":
      return def.innerType._def.typeName === "ZodFunction"
        ? def.defaultValue()
        : clone(def.defaultValue());
    default:
      return null;
  }
}