import { Banner, BlockStack, Button, Card, FormLayout, Text, TextField } from "@shopify/polaris";
import { useState } from "react";

interface PaystackSetupProps {
  hasKeys: boolean;
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
}

export function PaystackSetup({ hasKeys, onSubmit, isSubmitting }: PaystackSetupProps) {
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState("");

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Paystack Integration
        </Text>
        {hasKeys ? (
          <Banner tone="success">
            Paystack keys are connected. Your subscriptions will process through Paystack.
          </Banner>
        ) : (
          <Banner tone="warning">
            Connect your Paystack account to start accepting subscription payments.
          </Banner>
        )}
        <FormLayout>
          <TextField
            label="Secret Key"
            type="password"
            value={secretKey}
            onChange={setSecretKey}
            autoComplete="off"
            helpText={hasKeys ? "Enter new key to update" : "Starts with sk_test_ or sk_live_"}
          />
          <TextField
            label="Public Key"
            type="password"
            value={publicKey}
            onChange={setPublicKey}
            autoComplete="off"
            helpText={hasKeys ? "Enter new key to update" : "Starts with pk_test_ or pk_live_"}
          />
          <Button
            variant="primary"
            loading={isSubmitting}
            onClick={() => {
              const formData = new FormData();
              formData.append("secretKey", secretKey);
              formData.append("publicKey", publicKey);
              formData.append("intent", "paystack-keys");
              onSubmit(formData);
            }}
            disabled={!secretKey || !publicKey}
          >
            {hasKeys ? "Update Keys" : "Connect Paystack"}
          </Button>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}
