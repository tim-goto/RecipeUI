"use client";

import { useContext, useState } from "react";

import { RecipeMutationContentType } from "types/enums";
import {
  DesktopPage,
  RecipeContext,
  useRecipeSessionStore,
} from "../../../state/recipeSession";
import { useRouter } from "next/navigation";
import { setConfigForSessionStore } from "../../../state/apiSession";
import { JSONSchema6 } from "json-schema";
import { useSessionStorage } from "usehooks-ts";
import { RECIPE_FORKING_ID } from "../../../utils/constants/main";
import { useIsTauri } from "../../../hooks/useIsTauri";
import { DesktopAppUpsell } from "../../../pages/editor/EditorPage";
import { Recipe } from "types/database";

export function getConfigFromRecipe(selectedRecipe: Recipe) {
  return {
    recipeId: selectedRecipe.id,
    config: {
      editorAuth: selectedRecipe.auth
        ? {
            type: selectedRecipe.auth,
            docs: selectedRecipe.options?.docs?.auth,
            meta: selectedRecipe.options?.auth?.find(
              (a) => a.type === selectedRecipe.auth
            )?.payload.name,
          }
        : null,

      editorUrl: selectedRecipe.path,
      editorMethod: selectedRecipe.method,

      editorBodyType: RecipeMutationContentType.JSON,
      editorBodySchemaType: selectedRecipe.requestBodyType,
      editorBodySchemaJSON: selectedRecipe.requestBody as JSONSchema6,

      editorQuerySchemaType: selectedRecipe.queryParamsType,
      editorQuerySchemaJSON: selectedRecipe.queryParams as JSONSchema6,

      editorURLSchemaType: selectedRecipe.urlParamsType,
      editorURLSchemaJSON: selectedRecipe.urlParams as JSONSchema6,

      editorHeader: {
        title: selectedRecipe.title,
        description: selectedRecipe.summary,
      },

      editorURLCode: "",
    },
  };
}

export function RecipeForkTab() {
  const selectedRecipe = useContext(RecipeContext)!;
  const user = useRecipeSessionStore((state) => state.user);
  const addEditorSession = useRecipeSessionStore(
    (state) => state.addEditorSession
  );

  const router = useRouter();

  const [_, setRecipeFork] = useSessionStorage(RECIPE_FORKING_ID, "");

  const [loading, setLoading] = useState(false);

  const isTauri = useIsTauri();
  const setDesktopPage = useRecipeSessionStore((state) => state.setDesktopPage);

  const onSubmit = async () => {
    if (!selectedRecipe) {
      alert("No recipe selected");
      return;
    }

    if (!user) {
      alert("You must be logged in to fork a recipe");
      // Nothing really blocking this! So if you fork this code, you can just remove it.
      return;
    }

    try {
      setLoading(true);

      setRecipeFork(selectedRecipe.id);

      if (isTauri) {
        setDesktopPage({
          page: DesktopPage.Editor,
        });
      } else {
        router.push(`/editor`);
      }
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="flex-1 relative px-4 py-6">
      <div className="alert flex flex-col items-start w-full bg-slate-600 text-white">
        <div className="w-full space-y-4 text-start">
          <h1 className="font-bold text-xl">Fork into RecipeUI Editor</h1>
          {isTauri ? (
            <p>
              Fork into our <span className="font-bold">TypeScript-First</span>{" "}
              API tool! Figure out the parameters on your own.
            </p>
          ) : (
            <DesktopAppUpsell />
          )}
          <div className="flex space-x-4">
            <button
              className="btn btn-accent btn-sm"
              disabled={loading}
              onClick={onSubmit}
            >
              {isTauri ? "Fork" : "Fork to Web Editor"}
              {loading && <span className="loading loading-bars"></span>}
            </button>
            {!isTauri && (
              <button
                className="btn btn-accent btn-sm"
                onClick={() => {
                  router.push("/download");
                }}
              >
                Download Desktop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}