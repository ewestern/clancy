#!/bin/bash

echo "=== Finding Shared Module Resource IDs ==="
echo "Using AWS Profile: clancy"
echo ""

# VPC
echo "🔍 Finding VPC..."
VPC_ID=$(aws ec2 describe-vpcs --profile=clancy --filters "Name=tag:Name,Values=clancy-staging-vpc" --query 'Vpcs[0].VpcId' --output text 2>/dev/null)
if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
    VPC_ID=$(aws ec2 describe-vpcs --profile=clancy --filters "Name=cidr-block,Values=10.0.0.0/16" --query 'Vpcs[0].VpcId' --output text 2>/dev/null)
fi
echo "VPC ID: $VPC_ID"

# Internet Gateway
echo "🔍 Finding Internet Gateway..."
IGW_ID=$(aws ec2 describe-internet-gateways --profile=clancy --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query 'InternetGateways[0].InternetGatewayId' --output text 2>/dev/null)
echo "Internet Gateway ID: $IGW_ID"

# Security Group
echo "🔍 Finding Security Group..."
SG_ID=$(aws ec2 describe-security-groups --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=shared-sg-staging*" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)
echo "Security Group ID: $SG_ID"

# EIPs
echo "🔍 Finding Elastic IPs..."
EIP_2A=$(aws ec2 describe-addresses --profile=clancy --query 'Addresses[?Tags[?Key==`Name` && contains(Value, `2a`)]] | [0].AllocationId' --output text 2>/dev/null)
EIP_2B=$(aws ec2 describe-addresses --profile=clancy --query 'Addresses[?Tags[?Key==`Name` && contains(Value, `2b`)]] | [0].AllocationId' --output text 2>/dev/null)
if [ "$EIP_2A" = "None" ] || [ -z "$EIP_2A" ]; then
    # Fallback: get all EIPs and assume first two are for NAT gateways
    EIPS=($(aws ec2 describe-addresses --profile=clancy --query 'Addresses[*].AllocationId' --output text))
    EIP_2A=${EIPS[0]:-"NOT_FOUND"}
    EIP_2B=${EIPS[1]:-"NOT_FOUND"}
fi
echo "EIP 2A: $EIP_2A"
echo "EIP 2B: $EIP_2B"

# NAT Gateways
echo "🔍 Finding NAT Gateways..."
NAT_2A=$(aws ec2 describe-nat-gateways --profile=clancy --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available" --query 'NatGateways[?SubnetId && contains(SubnetId, `us-east-1a`)] | [0].NatGatewayId' --output text 2>/dev/null)
NAT_2B=$(aws ec2 describe-nat-gateways --profile=clancy --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available" --query 'NatGateways[?SubnetId && contains(SubnetId, `us-east-1b`)] | [0].NatGatewayId' --output text 2>/dev/null)
if [ "$NAT_2A" = "None" ] || [ -z "$NAT_2A" ]; then
    # Fallback: get all NAT gateways
    NATS=($(aws ec2 describe-nat-gateways --profile=clancy --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available" --query 'NatGateways[*].NatGatewayId' --output text))
    NAT_2A=${NATS[0]:-"NOT_FOUND"}
    NAT_2B=${NATS[1]:-"NOT_FOUND"}
fi
echo "NAT Gateway 2A: $NAT_2A"
echo "NAT Gateway 2B: $NAT_2B"

# Route Tables
echo "🔍 Finding Route Tables..."
RT_PUBLIC=$(aws ec2 describe-route-tables --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=clancy-staging-public-route-table" --query 'RouteTables[0].RouteTableId' --output text 2>/dev/null)
RT_PRIVATE_2A=$(aws ec2 describe-route-tables --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=clancy-staging-private-route-table-2a" --query 'RouteTables[0].RouteTableId' --output text 2>/dev/null)
RT_PRIVATE_2B=$(aws ec2 describe-route-tables --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=clancy-staging-private-route-table-2b" --query 'RouteTables[0].RouteTableId' --output text 2>/dev/null)
echo "Public Route Table: $RT_PUBLIC"
echo "Private Route Table 2A: $RT_PRIVATE_2A"
echo "Private Route Table 2B: $RT_PRIVATE_2B"

# Subnets
echo "🔍 Finding Subnets..."
SUBNET_PUB_2A=$(aws ec2 describe-subnets --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=availability-zone,Values=us-east-1a" "Name=tag:Name,Values=staging-public-subnet-2a" --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
SUBNET_PRIV_2A=$(aws ec2 describe-subnets --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=availability-zone,Values=us-east-1a" "Name=tag:Name,Values=staging-private-subnet-2a" --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
SUBNET_PUB_2B=$(aws ec2 describe-subnets --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=availability-zone,Values=us-east-1b" "Name=tag:Name,Values=staging-public-subnet-2b" --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
SUBNET_PRIV_2B=$(aws ec2 describe-subnets --profile=clancy --filters "Name=vpc-id,Values=$VPC_ID" "Name=availability-zone,Values=us-east-1b" "Name=tag:Name,Values=staging-private-subnet-2b" --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
echo "Public Subnet 2A: $SUBNET_PUB_2A"
echo "Private Subnet 2A: $SUBNET_PRIV_2A"
echo "Public Subnet 2B: $SUBNET_PUB_2B"
echo "Private Subnet 2B: $SUBNET_PRIV_2B"

# Load Balancer
echo "🔍 Finding Load Balancer..."
LB_ARN=$(aws elbv2 describe-load-balancers --profile=clancy --names "lb-staging" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null)
echo "Load Balancer ARN: $LB_ARN"

# Load Balancer Listener
echo "�� Finding Load Balancer Listener..."
if [ "$LB_ARN" != "None" ] && [ ! -z "$LB_ARN" ]; then
    LISTENER_ARN=$(aws elbv2 describe-listeners --profile=clancy --load-balancer-arn "$LB_ARN" --query 'Listeners[?Port==`443`] | [0].ListenerArn' --output text 2>/dev/null)
    echo "Listener ARN: $LISTENER_ARN"
fi

# ECS Cluster
echo "🔍 Finding ECS Cluster..."
ECS_CLUSTER=$(aws ecs describe-clusters --profile=clancy --clusters "clancy_staging" --query 'clusters[0].clusterName' --output text 2>/dev/null)
echo "ECS Cluster: $ECS_CLUSTER"

# Service Discovery Namespace
echo "🔍 Finding Service Discovery Namespace..."
SD_NAMESPACE=$(aws servicediscovery list-namespaces --profile=clancy --query 'Namespaces[?Name==`clancy-staging`] | [0].Id' --output text 2>/dev/null)
echo "Service Discovery Namespace: $SD_NAMESPACE"

echo ""
echo "🎯 SUMMARY FOR IMPORTS:"
echo "Replace the following in your imports.tf:"
echo ""
echo "VPC: $VPC_ID"
echo "IGW: $IGW_ID" 
echo "Security Group: $SG_ID"
echo "EIP 2A: $EIP_2A"
echo "EIP 2B: $EIP_2B"
echo "NAT 2A: $NAT_2A"
echo "NAT 2B: $NAT_2B"
echo "RT Public: $RT_PUBLIC"
echo "RT Private 2A: $RT_PRIVATE_2A"
echo "RT Private 2B: $RT_PRIVATE_2B"
echo "Subnet Public 2A: $SUBNET_PUB_2A"
echo "Subnet Private 2A: $SUBNET_PRIV_2A"
echo "Subnet Public 2B: $SUBNET_PUB_2B"
echo "Subnet Private 2B: $SUBNET_PRIV_2B"
echo "LB ARN: $LB_ARN"
echo "Listener ARN: $LISTENER_ARN"
echo "Service Discovery NS: $SD_NAMESPACE"

