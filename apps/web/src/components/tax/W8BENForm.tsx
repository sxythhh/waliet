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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COUNTRIES,
  TAX_TREATY_COUNTRIES,
  W8BENFormData,
  hasTaxTreaty,
  getTreatyRate,
} from '@/types/tax-forms';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const w8benSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  countryOfCitizenship: z.string().min(2, 'Country of citizenship is required'),
  permanentAddress: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  postalCode: z.string().optional(),
  mailingAddressDifferent: z.boolean(),
  mailingAddress: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingCountry: z.string().optional(),
  mailingPostalCode: z.string().optional(),
  foreignTIN: z.string().optional(),
  foreignTINNotRequired: z.boolean(),
  usTIN: z.string().optional(),
  referenceNumbers: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  claimTreatyBenefits: z.boolean(),
  treatyCountry: z.string().optional(),
  treatyArticle: z.string().optional(),
  treatyRate: z.number().min(0).max(30).optional(),
  treatyConditions: z.string().optional(),
}).refine(
  (data) => {
    if (data.mailingAddressDifferent) {
      return data.mailingAddress && data.mailingCity && data.mailingCountry;
    }
    return true;
  },
  {
    message: 'Mailing address details are required',
    path: ['mailingAddress'],
  }
).refine(
  (data) => {
    if (data.claimTreatyBenefits) {
      return data.treatyCountry && data.treatyRate !== undefined;
    }
    return true;
  },
  {
    message: 'Treaty country and rate are required when claiming treaty benefits',
    path: ['treatyCountry'],
  }
);

export type W8BENFormValues = z.infer<typeof w8benSchema>;

interface W8BENFormProps {
  onSubmit: (data: W8BENFormData) => void;
  defaultValues?: Partial<W8BENFormData>;
  isSubmitting?: boolean;
}

export function W8BENForm({ onSubmit, defaultValues, isSubmitting }: W8BENFormProps) {
  const [showMailing, setShowMailing] = useState(false);
  const [showTreaty, setShowTreaty] = useState(false);

  const form = useForm<W8BENFormValues>({
    resolver: zodResolver(w8benSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      countryOfCitizenship: defaultValues?.countryOfCitizenship || '',
      permanentAddress: defaultValues?.permanentAddress || '',
      city: defaultValues?.city || '',
      country: defaultValues?.country || '',
      postalCode: defaultValues?.postalCode || '',
      mailingAddressDifferent: defaultValues?.mailingAddressDifferent || false,
      mailingAddress: defaultValues?.mailingAddress || '',
      mailingCity: defaultValues?.mailingCity || '',
      mailingCountry: defaultValues?.mailingCountry || '',
      mailingPostalCode: defaultValues?.mailingPostalCode || '',
      foreignTIN: defaultValues?.foreignTIN || '',
      foreignTINNotRequired: defaultValues?.foreignTINNotRequired || false,
      usTIN: defaultValues?.usTIN || '',
      referenceNumbers: defaultValues?.referenceNumbers || '',
      dateOfBirth: defaultValues?.dateOfBirth || '',
      claimTreatyBenefits: defaultValues?.claimTreatyBenefits || false,
      treatyCountry: defaultValues?.treatyCountry || '',
      treatyArticle: defaultValues?.treatyArticle || '',
      treatyRate: defaultValues?.treatyRate,
      treatyConditions: defaultValues?.treatyConditions || '',
    },
  });

  const mailingDifferent = form.watch('mailingAddressDifferent');
  const claimTreaty = form.watch('claimTreatyBenefits');
  const citizenshipCountry = form.watch('countryOfCitizenship');

  const handleTreatyCountryChange = (countryCode: string) => {
    form.setValue('treatyCountry', countryCode);
    if (countryCode) {
      const rate = getTreatyRate(countryCode);
      form.setValue('treatyRate', rate);
      form.setValue('treatyArticle', 'Article 14 (Independent Personal Services)');
    }
  };

  const handleSubmit = (values: W8BENFormValues) => {
    onSubmit(values as W8BENFormData);
  };

  const nonUSCountries = COUNTRIES.filter(c => c.code !== 'US');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Identification */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Full legal name</FormLabel>
                <FormControl>
                  <Input placeholder="As shown on government ID" {...field} className="h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="countryOfCitizenship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Country of citizenship</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {nonUSCountries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
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
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Date of birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <FormLabel className="text-sm font-medium">Permanent residence address</FormLabel>

          <FormField
            control={form.control}
            name="permanentAddress"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Street address" {...field} className="h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="City" {...field} className="h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Postal code" {...field} className="h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {nonUSCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mailing Address (expandable) */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowMailing(!showMailing)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showMailing && "rotate-180")} />
            Different mailing address
          </button>

          {showMailing && (
            <div className="space-y-4 pl-6 border-l-2 border-border">
              <FormField
                control={form.control}
                name="mailingAddressDifferent"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">Use different mailing address</FormLabel>
                  </FormItem>
                )}
              />

              {mailingDifferent && (
                <>
                  <FormField
                    control={form.control}
                    name="mailingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Street address" {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mailingCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="City" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mailingPostalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Postal code" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="mailingCountry"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Tax ID */}
        <div className="space-y-4">
          <FormLabel className="text-sm font-medium">Tax identification</FormLabel>

          <FormField
            control={form.control}
            name="foreignTIN"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Foreign tax ID number"
                    {...field}
                    className="h-10"
                    disabled={form.watch('foreignTINNotRequired')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="foreignTINNotRequired"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal text-muted-foreground">
                  My country does not issue tax IDs
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Treaty Benefits (expandable) */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowTreaty(!showTreaty)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showTreaty && "rotate-180")} />
            Claim tax treaty benefits
          </button>

          {showTreaty && (
            <div className="space-y-4 pl-6 border-l-2 border-border">
              <FormField
                control={form.control}
                name="claimTreatyBenefits"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      I am eligible for treaty benefits
                    </FormLabel>
                  </FormItem>
                )}
              />

              {claimTreaty && (
                <>
                  <FormField
                    control={form.control}
                    name="treatyCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Treaty country</FormLabel>
                        <Select onValueChange={handleTreatyCountryChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TAX_TREATY_COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name} ({country.servicesRate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {citizenshipCountry && hasTaxTreaty(citizenshipCountry) && (
                          <FormDescription className="text-xs">
                            Your country has a tax treaty with the US.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="treatyArticle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Article</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Article 14" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="treatyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Withholding rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="30"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </form>
    </Form>
  );
}
