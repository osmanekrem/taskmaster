export type FieldApi = {
  name: string;
  state: {
    value: any;
    meta: {
      errors: Array<{ message?: string } | undefined>;
    };
  };
  handleBlur: () => void;
  handleChange: (value: any) => void;
};
