import { withMultiStepForm } from "./context"
import {z} from 'zod';

const step1 = z.object({
    name: z.string().default("something"),
    age: z.number().default(1)
})

const step2 = z.object({
    category: z.string()
})

const steps = z.object({
    ...step1.shape,
    ...step2.shape
});

type inferedType = z.infer<typeof steps>;


export const {FormProvider, useMultiStepForm} = withMultiStepForm<inferedType>(steps);