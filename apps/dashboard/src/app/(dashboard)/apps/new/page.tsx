"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppCatalog } from "@/components/apps/AppCatalog";
import { PageContainer } from "@/components/ui/PageContainer";
import { useI18n } from "@/components/i18n-provider";

export default function NewAppPage() {
  const { t } = useI18n();
  return (
    <PageContainer outerClassName="pb-20">
      <Link href="/projects" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t.dashboard.pages.apps.cancel}
      </Link>
      <AppCatalog />
    </PageContainer>
  );
}
