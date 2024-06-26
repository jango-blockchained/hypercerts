import { useContractModal } from "../components/contract-interaction-dialog-context";
import { mintInteractionLabels } from "../content/chainInteractions";
import { useParseBlockchainError } from "../lib/parse-blockchain-error";
import { toast } from "react-toastify";
import { useHypercertClient } from "./hypercerts-client";
import { useState } from "react";
import { usePublicClient } from "wagmi";

export const useMergeFractionUnits = ({
  onComplete,
}: {
  onComplete?: () => void;
}) => {
  const [txPending, setTxPending] = useState(false);

  const { client, isLoading } = useHypercertClient();
  const publicClient = usePublicClient();

  const stepDescriptions = {
    preparing: "Preparing to merge fraction values",
    merging: "Merging values on-chain",
    waiting: "Awaiting confirmation",
    complete: "Done merging",
  };

  const { setStep, showModal, hideModal } = useContractModal();
  const parseError = useParseBlockchainError();

  const initializeWrite = async (ids: bigint[]) => {
    setStep("merging");
    try {
      setTxPending(true);

      if (!client) {
        toast("No client found", {
          type: "error",
        });
        return;
      }

      const hash = await client.mergeFractionUnits(ids);

      if (!hash) {
        toast("No tx hash returned", {
          type: "error",
        });
        return;
      }

      const receipt = await publicClient?.waitForTransactionReceipt({
        confirmations: 3,
        hash,
      });
      setStep("waiting");

      if (receipt?.status === "reverted") {
        toast("Merging failed", {
          type: "error",
        });
        console.error(receipt);
      }
      if (receipt?.status === "success") {
        toast("Fractions successfully merged", { type: "success" });

        setStep("complete");
        onComplete?.();
      }
    } catch (error) {
      toast(parseError(error, mintInteractionLabels.toastError), {
        type: "error",
      });
      console.error(error);
    } finally {
      hideModal();
      setTxPending(false);
    }
  };

  return {
    write: async (ids: bigint[]) => {
      showModal({ stepDescriptions });
      setStep("preparing");
      await initializeWrite(ids);
      window.location.reload();
    },
    txPending,
    readOnly: isLoading || !client || client.readonly,
  };
};
