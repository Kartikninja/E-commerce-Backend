export interface CategoryInterface {
    name: string;
    description?: string;
    images?: string[];
    userId: string;
    storeId: string;



    refundPolicy: 'no-refund' | '7-days' | '30-days' | 'custom',
    replacementPolicy: 'no-replacement' | '7-days' | '30-days' | 'custom',
    customPolicyDetails: string

}
