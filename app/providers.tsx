"use client"
import { FormProvider } from "./store"
export function Providers({children} : {children: React.ReactNode}){
    
    return (
        <FormProvider>
            {children}
        </FormProvider>
    )
}