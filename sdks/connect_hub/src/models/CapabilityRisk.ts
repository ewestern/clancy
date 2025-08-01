/* tslint:disable */
/* eslint-disable */
/**
 * ConnectHub API
 * Unified integration, token, and proxy layer for Clancy Digital-Employees
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


/**
 * 
 * @export
 */
export const CapabilityRisk = {
    Low: 'LOW',
    Medium: 'MEDIUM',
    High: 'HIGH'
} as const;
export type CapabilityRisk = typeof CapabilityRisk[keyof typeof CapabilityRisk];


export function instanceOfCapabilityRisk(value: any): boolean {
    for (const key in CapabilityRisk) {
        if (Object.prototype.hasOwnProperty.call(CapabilityRisk, key)) {
            if (CapabilityRisk[key as keyof typeof CapabilityRisk] === value) {
                return true;
            }
        }
    }
    return false;
}

export function CapabilityRiskFromJSON(json: any): CapabilityRisk {
    return CapabilityRiskFromJSONTyped(json, false);
}

export function CapabilityRiskFromJSONTyped(json: any, ignoreDiscriminator: boolean): CapabilityRisk {
    return json as CapabilityRisk;
}

export function CapabilityRiskToJSON(value?: CapabilityRisk | null): any {
    return value as any;
}

export function CapabilityRiskToJSONTyped(value: any, ignoreDiscriminator: boolean): CapabilityRisk {
    return value as CapabilityRisk;
}

