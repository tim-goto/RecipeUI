"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRecipeSessionStore } from "../../../state/recipeSession";
import { RecipeAuthType } from "types/enums";
import classNames from "classnames";
import { SecretAPI } from "../../../state/apiSession/SecretAPI";
import {
  MultipleAuthConfig,
  SingleAuthConfig,
  TraditionalSingleAuth,
} from "types/database";
import { useForm } from "react-hook-form";
import { produce } from "immer";

export function EditorAuth() {
  const editorAuthConfig = useRecipeSessionStore(
    (state) => state.editorAuthConfig
  );
  const setEditorAuthConfig = useRecipeSessionStore(
    (state) => state.setEditorAuthConfig
  );

  const singleConfig =
    editorAuthConfig && editorAuthConfig.type !== RecipeAuthType.Multiple
      ? editorAuthConfig
      : null;

  return (
    <div className="flex-1 overflow-y-auto">
      {singleConfig && <SingleAuthConfig editorAuthConfig={singleConfig} />}
      {editorAuthConfig?.type === RecipeAuthType.Multiple && (
        <MultipleAuthConfig editorAuthConfig={editorAuthConfig} />
      )}
      <div className="grid grid-cols-2 gap-4 px-4 py-4 border-t border-recipe-slate">
        <AuthButton
          label="None"
          description="This API request no authentication."
          onClick={() => {
            setEditorAuthConfig(null);
          }}
          selected={editorAuthConfig === null}
        />
        <AuthButton
          label="Bearer"
          description='Very common for APIs. Uses Bearer prefix in "Authorization" header.'
          selected={singleConfig?.type === RecipeAuthType.Bearer}
          onClick={() => {
            setEditorAuthConfig({
              type: RecipeAuthType.Bearer,
            });
          }}
        />
        <AuthButton
          label="Query"
          description="An API key in a query parameter."
          selected={singleConfig?.type === RecipeAuthType.Query}
          onClick={() => {
            setEditorAuthConfig({
              type: RecipeAuthType.Query,
              payload: {
                name: "api_key",
              },
            });
          }}
        />
        <AuthButton
          label="Header"
          description="An API key in a header."
          selected={singleConfig?.type === RecipeAuthType.Header}
          onClick={() => {
            setEditorAuthConfig({
              type: RecipeAuthType.Header,
              payload: {
                name: "Authorization",
              },
            });
          }}
        />
        <AuthButton
          label="Basic"
          description="Basic auth with username and password."
          selected={singleConfig?.type === RecipeAuthType.Basic}
          onClick={() => {
            setEditorAuthConfig({
              type: RecipeAuthType.Basic,
              payload: {
                name: "base64",
              },
            });
          }}
        />
        <AuthButton
          label="Multiple"
          description="Multiple headers or query keys,"
          selected={editorAuthConfig?.type === RecipeAuthType.Multiple}
          onClick={() => {
            setEditorAuthConfig({
              type: RecipeAuthType.Multiple,
              payload: [
                {
                  type: RecipeAuthType.Header,
                  payload: {
                    name: "Authorization",
                  },
                },
              ],
            });
          }}
        />
        <AuthButton
          label="OAuth (Soon)"
          description="Join our Discord or email us to use this feature now."
          // selected={singleConfig?.type === RecipeAuthType.OAuth}
          className="opacity-50 pointer-events-none"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}

function SingleAuthConfig({
  editorAuthConfig,
}: {
  editorAuthConfig: SingleAuthConfig;
}) {
  if (
    editorAuthConfig.type === RecipeAuthType.Bearer ||
    editorAuthConfig.type === RecipeAuthType.Query ||
    editorAuthConfig.type === RecipeAuthType.Header
  ) {
    return <TraditionalSingleAuthConfig editorAuthConfig={editorAuthConfig} />;
  }

  if (editorAuthConfig.type === RecipeAuthType.Basic) {
    return <BasicAuth editorAuthConfig={editorAuthConfig} />;
  }

  return null;
}

function useAuthSecret<T>(editorAuthConfig: T) {
  const [authConfig, setAuthConfig] = useState<T | null>(null);

  useEffect(() => {
    setAuthConfig(editorAuthConfig);
  }, [editorAuthConfig]);

  const currentSession = useRecipeSessionStore(
    (state) => state.currentSession
  )!;

  const [secret, setSecret] = useState("");
  useEffect(() => {
    SecretAPI.getSecret({ secretId: currentSession.recipeId }).then(
      (secret) => {
        setSecret(secret || "");
      }
    );
  }, [currentSession?.recipeId]);

  return {
    secret,
    setSecret,
    setAuthConfig: setAuthConfig as Dispatch<SetStateAction<T | null>>,
    authConfig: authConfig as T | null,
  };
}

function TraditionalSingleAuthConfig({
  editorAuthConfig,
}: {
  editorAuthConfig: TraditionalSingleAuth;
}) {
  const currentSession = useRecipeSessionStore(
    (state) => state.currentSession
  )!;
  const setEditorAuthConfig = useRecipeSessionStore(
    (state) => state.setEditorAuthConfig
  );
  const [hasChanged, setHasChanged] = useState(false);
  const { secret, setSecret, authConfig, setAuthConfig } =
    useAuthSecret(editorAuthConfig);

  return (
    <div className={classNames("py-2 p-4 pb-4")}>
      {editorAuthConfig.type !== RecipeAuthType.Bearer && (
        <AuthFormWrapper label={`${editorAuthConfig.type} Param Name`}>
          <input
            type="text"
            autoCorrect="off"
            className={classNames(
              "input input-bordered w-full input-sm",
              !authConfig?.payload?.name && "input-error"
            )}
            placeholder={
              editorAuthConfig.type === RecipeAuthType.Header
                ? "e.g Authorization"
                : "e.g api_key"
            }
            value={authConfig?.payload?.name}
            onChange={(e) => {
              if (!hasChanged) setHasChanged(true);

              setAuthConfig({
                type: editorAuthConfig.type,
                payload: {
                  ...authConfig?.payload,
                  name: e.target.value,
                },
              });
            }}
          />
        </AuthFormWrapper>
      )}
      <AuthFormWrapper
        label={`${editorAuthConfig.type} Secret Value`}
        description={
          editorAuthConfig.type === RecipeAuthType.Bearer
            ? "Bearer token. Do not include the word 'Bearer'."
            : undefined
        }
      >
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          className={classNames(
            "input input-bordered w-full input-sm",
            !secret && "input-error"
          )}
          value={secret}
          onChange={(e) => {
            if (!hasChanged) setHasChanged(true);

            setSecret(e.target.value);
          }}
        />
      </AuthFormWrapper>
      <div className="space-x-2">
        <button
          className={classNames(
            "btn btn-sm btn-accent mt-2",
            !hasChanged && "btn-disabled"
          )}
          onClick={async () => {
            await SecretAPI.saveSecret({
              secretId: currentSession!.recipeId,
              secretValue: secret,
            });

            setEditorAuthConfig(authConfig);
            setHasChanged(false);
          }}
        >
          Save changes
        </button>
        <button
          className={classNames(
            "btn btn-sm btn-neutral mt-2",
            !secret && "btn-disabled"
          )}
          onClick={() => {
            setHasChanged(false);
            SecretAPI.deleteSecret({
              secretId: currentSession!.recipeId,
            });
            setSecret("");

            alert("Deleted secret");
          }}
        >
          Delete secret
        </button>
      </div>
    </div>
  );
}

function BasicAuth({
  editorAuthConfig,
}: {
  editorAuthConfig: Extract<SingleAuthConfig, { type: RecipeAuthType.Basic }>;
}) {
  const currentSession = useRecipeSessionStore(
    (state) => state.currentSession
  )!;
  const { secret, setSecret, authConfig } = useAuthSecret(editorAuthConfig);

  const {
    register,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<{
    username: string;
    password: string;
  }>();
  useEffect(() => {
    if (!secret) {
      setValue("username", "");
      setValue("password", "");
      return;
    }

    const [username, password] = atob(secret).split(":");
    setValue("username", username);
    setValue("password", password);
  }, [secret, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    // We can encrypt it earlier but it's a bit unclear to me?

    const encryptedSecret = btoa(`${data.username}:${data.password}`);
    await SecretAPI.saveSecret({
      secretId: currentSession!.recipeId,
      secretValue: encryptedSecret,
    });
    setSecret(encryptedSecret);

    reset(undefined, { keepValues: true });
  });

  return (
    <form className={classNames("py-2 p-4 pb-4")} onSubmit={onSubmit}>
      <AuthFormWrapper label={`Username`}>
        <input
          type="text"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="test@domain.com"
          className={classNames("input input-bordered w-full input-sm")}
          {...register("username", {
            required: true,
          })}
        />
      </AuthFormWrapper>
      {errors.username && (
        <p className="text-xs text-red-600">Username is required</p>
      )}

      <AuthFormWrapper label={`Password`}>
        <input
          type="text"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="password"
          className={classNames(
            "input input-bordered w-full input-sm",
            !authConfig?.payload?.name && "input-error"
          )}
          {...register("password", {
            required: true,
          })}
        />
      </AuthFormWrapper>
      {errors.password && (
        <p className="text-xs text-red-600">Password is required</p>
      )}

      <div className="space-x-2">
        <button
          type="submit"
          className={classNames(
            "btn btn-sm btn-accent mt-2",
            !isDirty && "btn-disabled"
          )}
        >
          Save changes
        </button>
        <button
          className={classNames(
            "btn btn-sm btn-neutral mt-2",
            !secret && "btn-disabled"
          )}
          onClick={() => {
            SecretAPI.deleteSecret({
              secretId: currentSession!.recipeId,
            });
            setSecret("");
            alert("Deleted secret");
          }}
        >
          Delete secret
        </button>
      </div>
    </form>
  );
}

function AuthButton({
  onClick,
  label,
  description,
  selected,
  className,
}: {
  onClick: () => void;
  label: string;
  description: string;
  selected?: boolean;
  className?: string;
}) {
  return (
    <button
      className={classNames(
        "border border-recipe-slate shadow-md rounded-md p-4 text-start space-y-2 h-[130px] flex flex-col justify-start",
        selected && "bg-slate-600  text-white",
        className
      )}
      onClick={onClick}
    >
      <p className="uppercase font-bold">{label}</p>
      <p className="text-sm">{description}</p>
    </button>
  );
}

function AuthFormWrapper({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="py-2">
      <h2 className="font-bold text-sm mb-2 capitalize">{label}</h2>
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}
      {children}
    </div>
  );
}

function MultipleAuthConfig({
  editorAuthConfig,
}: {
  editorAuthConfig: MultipleAuthConfig;
}) {
  const currentSession = useRecipeSessionStore(
    (state) => state.currentSession
  )!;
  const setEditorAuthConfig = useRecipeSessionStore(
    (state) => state.setEditorAuthConfig
  );

  const [hasChanged, setHasChanged] = useState(false);

  const [authConfigs, setAuthConfigs] = useState(editorAuthConfig.payload);
  useEffect(() => {
    setAuthConfigs(editorAuthConfig.payload);
  }, [editorAuthConfig]);

  const [authSecrets, setAuthSecrets] = useState<string[]>([]);
  const refreshSecret = useCallback(async () => {
    const newSecrets = await SecretAPI.getSecretArray({
      secretId: currentSession.recipeId,
    });
    setAuthSecrets(newSecrets);
  }, [currentSession.recipeId]);

  useEffect(() => {
    refreshSecret();
  }, [refreshSecret]);

  const onSave = async () => {
    setEditorAuthConfig({
      type: RecipeAuthType.Multiple,
      payload: authConfigs,
    });

    await SecretAPI.saveSecret({
      secretId: currentSession.recipeId,
      secretValue: JSON.stringify(authSecrets),
    });
    refreshSecret();
    setHasChanged(false);
  };

  return (
    <div className={classNames("p-4")}>
      <div className="space-y-4">
        {(authConfigs || []).map((authConfig, i) => {
          const secret = authSecrets[i];

          return (
            <div
              key={i}
              className="border rounded-md border-recipe-slate p-4 bg-base-200"
            >
              <AuthFormWrapper label={`Auth Type`}>
                <div className="space-x-2 mt-2">
                  <select
                    className="select select-bordered select-sm "
                    onChange={(e) => {
                      setAuthConfigs(
                        produce(authConfigs!, (draft) => {
                          draft[i].type = e.target.value as
                            | RecipeAuthType.Header
                            | RecipeAuthType.Query;
                        })
                      );
                    }}
                    value={authConfig.type}
                  >
                    <option value={RecipeAuthType.Header}>Header</option>
                    <option value={RecipeAuthType.Query}>Query</option>
                  </select>
                </div>
              </AuthFormWrapper>
              <AuthFormWrapper label={`${authConfig.type} Param Name`}>
                <input
                  type="text"
                  autoCorrect="off"
                  className={classNames(
                    "input input-bordered w-full input-sm",
                    !authConfig?.payload?.name && "input-error"
                  )}
                  placeholder={
                    authConfig.type === RecipeAuthType.Header
                      ? "e.g Authorization"
                      : "e.g api_key"
                  }
                  value={authConfig?.payload?.name}
                  onChange={(e) => {
                    if (!hasChanged) setHasChanged(true);

                    setAuthConfigs(
                      produce(authConfigs!, (draft) => {
                        draft[i].payload.name = e.target.value;
                      })
                    );
                  }}
                />
              </AuthFormWrapper>
              <AuthFormWrapper label={`${authConfig.type} Secret Value`}>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  className={classNames(
                    "input input-bordered w-full input-sm",

                    !secret && "input-error"
                  )}
                  value={secret}
                  onChange={(e) => {
                    if (!hasChanged) setHasChanged(true);

                    setAuthSecrets(
                      produce(authSecrets, (draft) => {
                        draft[i] = e.target.value;
                      })
                    );
                  }}
                />
              </AuthFormWrapper>
              <button
                className="btn btn-outline btn-sm mt-2"
                onClick={() => {
                  setHasChanged(true);
                  setAuthConfigs(
                    produce(authConfigs!, (draft) => {
                      draft.splice(i, 1);
                    })
                  );

                  setAuthSecrets(
                    produce(authSecrets, (draft) => {
                      draft.splice(i, 1);
                    })
                  );
                }}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-x-2">
        <button
          className={classNames(
            "btn btn-sm btn-accent mt-2",
            !hasChanged && "btn-disabled"
          )}
          onClick={onSave}
        >
          Save changes
        </button>
        <button
          className={classNames("btn btn-sm btn-primary mt-2")}
          onClick={() => {
            setHasChanged(true);
            setAuthConfigs(
              produce(authConfigs!, (draft) => {
                draft.push({
                  type: RecipeAuthType.Header,
                  payload: {
                    name: "",
                  },
                });
              })
            );
          }}
        >
          Add Secret
        </button>
        <button
          className={classNames("btn btn-sm btn-neutral mt-2")}
          onClick={async () => {
            setHasChanged(false);
            await SecretAPI.deleteSecret({
              secretId: currentSession!.recipeId,
            });
            setAuthSecrets([]);
            setAuthConfigs([]);

            setEditorAuthConfig({
              type: RecipeAuthType.Multiple,
              payload: [],
            });
            refreshSecret();

            alert("Deleted secret");
          }}
        >
          Delete all
        </button>
      </div>
    </div>
  );
}
