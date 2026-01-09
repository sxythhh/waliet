import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  US_STATES,
  FEDERAL_TAX_CLASSIFICATIONS,
  LLC_TAX_CLASSIFICATIONS,
  W9FormData,
  formatSSNInput,
  formatEINInput,
  validateSSN,
  validateEIN,
} from '@/types/tax-forms';

const w9Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  businessName: z.string().optional(),
  federalTaxClassification: z.enum([
    'individual',
    'c_corporation',
    's_corporation',
    'partnership',
    'trust_estate',
    'llc',
    'other',
  ]),
  llcTaxClassification: z.enum(['c', 's', 'p']).optional(),
  otherClassification: z.string().optional(),
  exemptPayeeCode: z.string().optional(),
  fatcaExemptionCode: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  accountNumbers: z.string().optional(),
  tinType: z.enum(['ssn', 'ein']),
  tin: z.string().min(1, 'TIN is required'),
}).refine(
  (data) => {
    if (data.federalTaxClassification === 'llc' && !data.llcTaxClassification) {
      return false;
    }
    return true;
  },
  {
    message: 'Please select LLC tax classification',
    path: ['llcTaxClassification'],
  }
).refine(
  (data) => {
    if (data.tinType === 'ssn') {
      return validateSSN(data.tin);
    } else {
      return validateEIN(data.tin);
    }
  },
  {
    message: 'Invalid TIN format',
    path: ['tin'],
  }
);

export type W9FormValues = z.infer<typeof w9Schema>;

interface W9FormProps {
  onSubmit: (data: W9FormData) => void;
  defaultValues?: Partial<W9FormData>;
  isSubmitting?: boolean;
}

export function W9Form({ onSubmit, defaultValues, isSubmitting }: W9FormProps) {
  const form = useForm<W9FormValues>({
    resolver: zodResolver(w9Schema),
    defaultValues: {
      name: defaultValues?.name || '',
      businessName: defaultValues?.businessName || '',
      federalTaxClassification: defaultValues?.federalTaxClassification || 'individual',
      llcTaxClassification: defaultValues?.llcTaxClassification,
      otherClassification: defaultValues?.otherClassification || '',
      exemptPayeeCode: defaultValues?.exemptPayeeCode || '',
      fatcaExemptionCode: defaultValues?.fatcaExemptionCode || '',
      address: defaultValues?.address || '',
      city: defaultValues?.city || '',
      state: defaultValues?.state || '',
      zipCode: defaultValues?.zipCode || '',
      accountNumbers: defaultValues?.accountNumbers || '',
      tinType: defaultValues?.tinType || 'ssn',
      tin: '',
    },
  });

  const federalTaxClass = form.watch('federalTaxClassification');
  const tinType = form.watch('tinType');

  const handleSubmit = (values: W9FormValues) => {
    onSubmit(values as W9FormData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Name */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Legal name <span className="text-muted-foreground font-normal">(as shown on tax return)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Business name <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="If different from above"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tax Classification */}
        <div className="space-y-3">
          <FormLabel className="text-sm font-medium">Tax classification</FormLabel>
          <FormField
            control={form.control}
            name="federalTaxClassification"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid gap-2"
                  >
                    {FEDERAL_TAX_CLASSIFICATIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-foreground/20 cursor-pointer transition-colors"
                      >
                        <RadioGroupItem value={option.value} />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {federalTaxClass === 'llc' && (
            <FormField
              control={form.control}
              name="llcTaxClassification"
              render={({ field }) => (
                <FormItem className="ml-6 mt-3">
                  <FormLabel className="text-sm">LLC tax classification</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LLC_TAX_CLASSIFICATIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {federalTaxClass === 'other' && (
            <FormField
              control={form.control}
              name="otherClassification"
              render={({ field }) => (
                <FormItem className="ml-6 mt-3">
                  <FormLabel className="text-sm">Specify classification</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Address */}
        <div className="space-y-4">
          <FormLabel className="text-sm font-medium">Address</FormLabel>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Street address"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-6 gap-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="col-span-3">
                  <FormControl>
                    <Input placeholder="City" {...field} className="h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormControl>
                    <Input
                      placeholder="ZIP"
                      {...field}
                      className="h-10"
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* TIN */}
        <div className="space-y-4">
          <FormLabel className="text-sm font-medium">Taxpayer Identification Number</FormLabel>

          <FormField
            control={form.control}
            name="tinType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex gap-6"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="ssn" />
                      <span className="text-sm">SSN</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="ein" />
                      <span className="text-sm">EIN</span>
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tin"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder={tinType === 'ssn' ? '123-45-6789' : '12-3456789'}
                    {...field}
                    onChange={(e) => {
                      const formatted = tinType === 'ssn'
                        ? formatSSNInput(e.target.value)
                        : formatEINInput(e.target.value);
                      field.onChange(formatted);
                    }}
                    className="h-10 max-w-[200px] font-mono"
                    maxLength={tinType === 'ssn' ? 11 : 10}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Encrypted and stored securely for tax reporting only.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}

export function useW9FormRef() {
  return useForm<W9FormValues>({
    resolver: zodResolver(w9Schema),
  });
}
