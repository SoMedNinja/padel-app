import { UpdateStateContent, UpdateUrgency } from "../shared/updateStates";

export const UPDATE_PROMPT_CONFIG = {
  copy: {
    // Note for non-coders: this small helper line is reused in every update message so users always know what the button does.
    reloadExplanation: "När du väljer Uppdatera nu laddas appen om en gång för att aktivera den nya versionen.",
    states: {
      optional: {
        title: "Uppdatering tillgänglig",
        message: "En ny version är redo med förbättringar. Du kan uppdatera nu eller fortsätta och göra det senare.",
        primaryActionLabel: "Uppdatera nu",
        secondaryActionLabel: "Senare",
      },
      recommended: {
        title: "Uppdatering rekommenderas",
        message: "En ny version finns med bättre stabilitet och förbättringar. Uppdatera gärna snart.",
        primaryActionLabel: "Uppdatera nu",
        secondaryActionLabel: "Senare",
      },
      required: {
        title: "Uppdatering krävs",
        message: "Din appversion är för gammal för den här miljön. Uppdatera nu för att fortsätta använda appen.",
        primaryActionLabel: "Uppdatera nu",
      },
    } satisfies Record<UpdateUrgency, UpdateStateContent>,
  },
};
