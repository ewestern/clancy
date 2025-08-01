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

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface WebhooksSlackPostRequestOneOfAuthorizationsInner
 */
export interface WebhooksSlackPostRequestOneOfAuthorizationsInner {
    /**
     * 
     * @type {string}
     * @memberof WebhooksSlackPostRequestOneOfAuthorizationsInner
     */
    enterpriseId?: string;
    /**
     * 
     * @type {string}
     * @memberof WebhooksSlackPostRequestOneOfAuthorizationsInner
     */
    teamId?: string;
    /**
     * 
     * @type {string}
     * @memberof WebhooksSlackPostRequestOneOfAuthorizationsInner
     */
    userId?: string;
}

/**
 * Check if a given object implements the WebhooksSlackPostRequestOneOfAuthorizationsInner interface.
 */
export function instanceOfWebhooksSlackPostRequestOneOfAuthorizationsInner(value: object): value is WebhooksSlackPostRequestOneOfAuthorizationsInner {
    return true;
}

export function WebhooksSlackPostRequestOneOfAuthorizationsInnerFromJSON(json: any): WebhooksSlackPostRequestOneOfAuthorizationsInner {
    return WebhooksSlackPostRequestOneOfAuthorizationsInnerFromJSONTyped(json, false);
}

export function WebhooksSlackPostRequestOneOfAuthorizationsInnerFromJSONTyped(json: any, ignoreDiscriminator: boolean): WebhooksSlackPostRequestOneOfAuthorizationsInner {
    if (json == null) {
        return json;
    }
    return {
        
        'enterpriseId': json['enterprise_id'] == null ? undefined : json['enterprise_id'],
        'teamId': json['team_id'] == null ? undefined : json['team_id'],
        'userId': json['user_id'] == null ? undefined : json['user_id'],
    };
}

export function WebhooksSlackPostRequestOneOfAuthorizationsInnerToJSON(json: any): WebhooksSlackPostRequestOneOfAuthorizationsInner {
    return WebhooksSlackPostRequestOneOfAuthorizationsInnerToJSONTyped(json, false);
}

export function WebhooksSlackPostRequestOneOfAuthorizationsInnerToJSONTyped(value?: WebhooksSlackPostRequestOneOfAuthorizationsInner | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'enterprise_id': value['enterpriseId'],
        'team_id': value['teamId'],
        'user_id': value['userId'],
    };
}

