"use client";

import {
  RecipeSession,
  useRecipeSessionStore,
} from "../../state/recipeSession";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { RouteTypeLabel } from "../RouteTypeLabel";
import { useHover, useSessionStorage } from "usehooks-ts";
import {
  CloudArrowUpIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  FolderArrowDownIcon,
  FolderIcon,
  FolderPlusIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  eventEmitter,
  getConfigForSessionStore,
  getParametersForSessionStore,
  getSessionsFromStore,
  saveSessionToStore,
} from "../../state/apiSession";
import { FolderAPI, useSessionFolders } from "../../state/apiSession/FolderAPI";

import { COLLECTION_FORKING_ID, RECIPE_FORKING_ID } from "utils/constants";

import { CurlModal } from "../../pages/editor/Builders/CurlModal";
import { useInitializeRecipe } from "../../hooks/useInitializeRecipe";
import { PublishFolderModal } from "../../pages/editor/Builders/PublishModal";
import { EditSessionModal } from "./EditSessionModal";
import { Recipe, RecipeSessionFolderExtended } from "types/database";
import { useSupabaseClient } from "../Providers/SupabaseProvider";
import { fetchProjectPage } from "../../fetchers/project";
import { RecipeUICollectionsAPI } from "../../state/apiSession/RecipeUICollectionsAPI";
import {
  RecipeCloudContext,
  cloudEventEmitter,
  useRecipeCloud,
} from "../../state/apiSession/CloudAPI";
import { ViewCollectionModal } from "./ViewCollectionModal";
import { FolderModal } from "./FolderModal";
import { DuplicateModal } from "./DuplicateModal";
import { EditFolderModal } from "./EditFolderModal";

export function RecipeSidebar() {
  const sessions = useRecipeSessionStore((state) => state.sessions);
  const setSessions = useRecipeSessionStore((state) => state.setSessions);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!loaded) return;

    saveSessionToStore(sessions);
  }, [loaded, sessions, setSessions]);

  const [recipeFork, setRecipeFork] = useSessionStorage(RECIPE_FORKING_ID, "");
  const [collectionFork, setCollectionFork] = useSessionStorage(
    COLLECTION_FORKING_ID,
    ""
  );

  const [curlModal, setCurlModal] = useState(false);

  const { initializeRecipe } = useInitializeRecipe();
  const supabase = useSupabaseClient();

  useEffect(() => {
    // The only place we initialize forks from APIs
    async function initializeAPIs() {
      if (!recipeFork) return;

      let [forkId, recipeTitle] = recipeFork.split("::");

      setRecipeFork("");
      initializeRecipe(forkId, { recipeTitle });
    }

    async function initializeCollection() {
      let recipes: Recipe[] = [];
      const localProject =
        await RecipeUICollectionsAPI.getProjectInfoWithProjectNameOrId({
          projectNameOrId: collectionFork,
        });

      if (localProject) {
        recipes = localProject.recipes;
      } else {
        const { recipes: _recipes } = await fetchProjectPage({
          project: collectionFork,
          supabase,
        });

        if (_recipes) {
          recipes = _recipes;
        }
      }

      setCollectionFork("");

      if (recipes && recipes.length > 0) {
        for (let i = 0; i < recipes.length; i++) {
          const recipe = recipes[i];
          await initializeRecipe(recipe.id, {
            recipePreDefined: recipe,
            noCurrentSession: i !== recipes.length - 1,
          });
        }
      }
    }

    async function refreshSidebar() {
      const sessions = await getSessionsFromStore();
      setSessions(sessions || []);
    }

    eventEmitter.on("refreshSidebar", refreshSidebar);
    refreshSidebar().then(() => {
      if (!loaded) {
        if (collectionFork) {
          initializeCollection();
        } else {
          initializeAPIs();
        }
        setLoaded(true);
      }
    });
    return () => {
      eventEmitter.off("refreshSidebar", refreshSidebar);
    };
  }, []);

  const [viewCollectionModal, setViewCollectionModal] = useState(false);

  const { folderSessions, noFolderSessions } = useSessionFolders();
  const addEditorSession = useRecipeSessionStore(
    (state) => state.addEditorSession
  );

  const [addFolderModal, setAddFolderModal] = useState(false);
  const recipeCloud = useRecipeCloud();

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="hidden sm:block w-60 border-r border-r-slate-200 dark:border-r-slate-600 overflow-x-clip overflow-y-auto">
      <div className="dropdown cursor-pointer w-full right-0 text-start border-b border-recipe-slate mb-2">
        <label
          tabIndex={0}
          className="cursor-pointer flex justify-start items-center  h-full px-2 text-xs text-start ml-2 py-4 font-bold"
        >
          New
          <PlusCircleIcon className="w-3 h-3 ml-1" />
        </label>
        <ul
          tabIndex={0}
          className="menu menu-sm dropdown-content  shadow z-10  rounded-lg bg-white dark:bg-slate-600 w-fit border left-2 top-8 text-end text-sm dark:text-white text-black"
          onClick={(e) => {
            // @ts-expect-error Need to get blur
            e.target.parentNode?.parentNode?.blur();

            setTimeout(() => {
              document.getElementById("url-input")?.focus();
            }, 500);
          }}
        >
          <li>
            <button
              onClick={(e) => {
                addEditorSession();
              }}
            >
              Request
            </button>
          </li>
          <li className="">
            <button
              className=""
              onClick={() => {
                setAddFolderModal(true);
              }}
            >
              Folder
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                setCurlModal(true);
              }}
            >
              Import from cURL
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                setViewCollectionModal(true);
              }}
            >
              Import collection
            </button>
          </li>
        </ul>
      </div>
      <RecipeCloudContext.Provider value={recipeCloud}>
        {Object.keys(folderSessions).length > 0 && (
          <ul className="menu py-0">
            {Object.keys(folderSessions).map((folderId) => {
              const folder = folderSessions[folderId];
              if (folder.parentFolderId) {
                return null;
              }

              return (
                <SessionFolder key={folderId} folder={folder} isRootFolder />
              );
            })}
          </ul>
        )}
      </RecipeCloudContext.Provider>
      {/* This is the base folder. It has no names. No indentation */}
      {noFolderSessions.length > 0 && (
        <div>
          <div className="text-start py-2 w-full">
            <h3 className="font-bold text-xs ml-4">
              {Object.keys(folderSessions).length !== 0
                ? "No Folder"
                : "Sessions"}
            </h3>
          </div>
          <ul className="menu py-0 w-full">
            {noFolderSessions.map((session) => (
              <SessionTab key={session.id} session={session} />
            ))}
          </ul>
        </div>
      )}

      {curlModal && <CurlModal onClose={() => setCurlModal(false)} />}
      {viewCollectionModal && (
        <ViewCollectionModal onClose={() => setViewCollectionModal(false)} />
      )}
      {addFolderModal && (
        <FolderModal onClose={() => setAddFolderModal(false)} />
      )}
    </div>
  );
}

function SessionFolder({
  folder,
  isRootFolder,
}: {
  folder: RecipeSessionFolderExtended;
  isRootFolder?: boolean;
}) {
  const recipeCloud = useContext(RecipeCloudContext);
  const isCloudFolder =
    recipeCloud.collectionRecord[folder.id] ??
    !!recipeCloud.folderToCollection[folder.id];

  const [editFolder, setEditFolder] =
    useState<RecipeSessionFolderExtended | null>(null);
  const [publishFolder, setPublishFolder] =
    useState<RecipeSessionFolderExtended | null>(null);
  const addEditorSession = useRecipeSessionStore(
    (state) => state.addEditorSession
  );
  const [addFolderModal, setAddFolderModal] = useState(false);

  return (
    <>
      <li className="w-full">
        <details className="relative w-full" open>
          <summary className="text-xs font-bold p-0 px-2 py-2 pr-4  w-full group">
            <span
              className={classNames(
                "flex items-center w-full",
                isCloudFolder && "text-blue-500 dark:text-accent"
              )}
            >
              {isCloudFolder ? (
                <FolderIcon
                  className={classNames(
                    "w-4 h-4 mr-2 mb-0.5",
                    isCloudFolder && "text-blue-500 dark:text-accent"
                  )}
                />
              ) : (
                <FolderIcon className="w-4 h-4 mr-2 mb-0.5" />
              )}

              {folder.name}
            </span>
            <div className="hidden absolute right-0 group-hover:flex z-10 bg-base-100 top-0 h-8 px-2 items-center group-hover:border rounded-md">
              <a
                className="hidden group-hover:block hover:animate-spin w-fit py-2 px-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setEditFolder(folder);
                }}
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </a>
              <a
                className="hidden group-hover:block hover:bg-accent w-fit py-2 px-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const session = addEditorSession();
                  FolderAPI.addSessionToFolder(session.id, folder.id);
                }}
              >
                <PlusCircleIcon className="w-4 h-4" />
              </a>
              <a
                className="hidden group-hover:block hover:bg-accent w-fit py-2 px-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setAddFolderModal(true);
                }}
              >
                <FolderPlusIcon className="w-4 h-4" />
              </a>
              {isRootFolder && (
                <a
                  className="hidden group-hover:block hover:bg-accent w-fit py-2 px-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    setPublishFolder(folder);
                  }}
                >
                  <ShareIcon className="w-4 h-4" />
                </a>
              )}
            </div>
          </summary>
          <ul>
            {folder.items.map((item) => {
              if (!item) return null;
              if (item.type === "session") {
                const session = item.session;

                return (
                  <SessionTab
                    key={session.id}
                    session={session}
                    cloudSession={recipeCloud.apiRecord[session.id]}
                    parentFolderId={folder.id}
                  />
                );
              } else {
                const folder = item.folder;

                return <SessionFolder key={folder.id} folder={folder} />;
              }
            })}
          </ul>
        </details>
      </li>
      {addFolderModal && (
        <FolderModal
          onClose={() => setAddFolderModal(false)}
          addToFolder={folder}
        />
      )}
      {editFolder && (
        <EditFolderModal
          onClose={() => setEditFolder(null)}
          folder={editFolder}
        />
      )}
      {publishFolder && (
        <PublishFolderModal
          onClose={() => setPublishFolder(null)}
          folder={publishFolder}
        />
      )}
    </>
  );
}

function SessionTab({
  session,
  cloudSession,
  parentFolderId,
}: {
  session: RecipeSession;
  cloudSession?: Recipe;
  parentFolderId?: string;
}) {
  const currentSession = useRecipeSessionStore((state) => state.currentSession);
  const isCurrentSession = currentSession?.id === session.id;

  const hoverRef = useRef(null);
  const isHover = useHover(hoverRef);

  const updateSessionName = useRecipeSessionStore(
    (state) => state.updateSessionName
  );
  const closeSession = useRecipeSessionStore((state) => state.closeSession);

  const [name, setName] = useState(session.name);

  const onUpdateSessionName = () => {
    updateSessionName(session, name);
  };
  const initializeEditorSession = useRecipeSessionStore(
    (state) => state.initializeEditorSession
  );
  const saveEditorSession = useRecipeSessionStore(
    (state) => state.saveEditorSession
  );

  const [duplicateModal, setDuplicateModal] = useState<null | {
    folder_id?: string;
  }>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const supabase = useSupabaseClient();

  return (
    <li className={classNames("relative cursor-pointer")}>
      <div
        ref={hoverRef}
        key={session.id}
        className={classNames(
          "pl-4 py-2 text-xs",
          isCurrentSession && "bg-gray-400 dark:text-black"
        )}
        onClick={async (e) => {
          e.stopPropagation();
          e.preventDefault();

          if (isCurrentSession) return;

          saveEditorSession().then(async () => {
            const parameters = await getParametersForSessionStore({
              session: session.id,
            });
            const config = await getConfigForSessionStore({
              recipeId: session.recipeId,
            });

            initializeEditorSession({
              currentSession: session,
              ...parameters,
              ...config,
            });
          });
        }}
      >
        <div
          className={classNames(
            "text-start whitespace-pre-wrap relative group min-w-full ",
            cloudSession &&
              (isCurrentSession
                ? "text-blue-500 dark:text-neutral"
                : "text-blue-500  dark:text-accent")
          )}
        >
          <RouteTypeLabel size="small" recipeMethod={session.apiMethod} />
          <h4
            className={classNames(
              "ml-2 inline",
              isCurrentSession && "text-neutral group-hover:text-accent"
            )}
          >
            {session.name || "New Session"}
          </h4>
        </div>
        {isHover && (
          <div
            className="absolute cursor-pointer w-fit right-0 top-0 h-8 px-2 bg-base-100 border justify-center  flex  rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <label
              className="cursor-pointer flex justify-center items-center  h-full px-1 py-2.5 w-fit hover:bg-accent"
              onClick={() => {
                setShowEditModal(true);
              }}
            >
              <PencilSquareIcon className="w-3" />
            </label>
            <label
              className="cursor-pointer flex justify-center items-center  h-full px-1 py-2.5 w-fit hover:bg-accent"
              onClick={() => {
                setDuplicateModal({ folder_id: parentFolderId });
              }}
            >
              <DocumentDuplicateIcon className="w-3" />
            </label>
            <label
              className="cursor-pointer flex justify-center items-center  h-full px-1 py-2.5 w-fit hover:bg-accent rounded-r-md"
              onClick={async (e) => {
                e.stopPropagation();

                const confirm = await window.confirm(
                  cloudSession
                    ? "Are you sure you want to permanently delete this API from the cloud and collection?"
                    : "Are you sure you want to delete this session?"
                );
                if (!confirm) return;

                if (cloudSession) {
                  await supabase.from("recipe").delete().match({
                    id: cloudSession.id,
                  });
                }

                const nextSession = closeSession(session);

                setTimeout(async () => {
                  await FolderAPI.deleteSessionFromFolder(session.id);
                  cloudEventEmitter.emit("refreshCloud");

                  setTimeout(() => {
                    eventEmitter.emit("refreshSidebar");
                  }, 0);

                  // This a bit bugger so temporarily disable
                  // if (nextSession) {
                  //   const parameters = await getParametersForSessionStore({
                  //     session: nextSession.id,
                  //   });
                  //   const config = await getConfigForSessionStore({
                  //     recipeId: nextSession.recipeId,
                  //   });

                  //   initializeEditorSession({
                  //     currentSession: nextSession,
                  //     ...parameters,
                  //     ...config,
                  //   });
                  // }
                }, 0);
              }}
            >
              <TrashIcon className="w-3" />
            </label>
          </div>
        )}
      </div>
      {duplicateModal && (
        <DuplicateModal
          folderId={duplicateModal.folder_id}
          onClose={() => setDuplicateModal(null)}
          session={session}
        />
      )}
      {showEditModal && (
        <EditSessionModal
          onClose={() => setShowEditModal(false)}
          session={session}
        />
      )}
    </li>
  );
}
