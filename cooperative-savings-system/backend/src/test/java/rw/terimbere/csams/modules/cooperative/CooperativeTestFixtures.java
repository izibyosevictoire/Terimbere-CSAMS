package rw.terimbere.csams.modules.cooperative;

import java.util.UUID;

/** Shared create-body helpers for cooperative integration tests. */
public final class CooperativeTestFixtures {

    private CooperativeTestFixtures() {}

    public static String createBody(String name) {
        return createBody(name, "1000.0000", 1);
    }

    public static String createBody(String name, String monthlyAmount, int dueDay) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return """
                {
                  "name":"%s",
                  "currency":"RWF",
                  "monthlyContributionAmount":%s,
                  "contributionDueDay":%d,
                  "financialYearStartMonth":1,
                  "registrationNumber":"RCA/TEST/%s",
                  "contactEmail":"coop-%s@test.local",
                  "contactPhone":"0781234567",
                  "registrationDate":"2024-01-15"
                }
                """
                .formatted(name, monthlyAmount, dueDay, suffix, suffix.toLowerCase());
    }
}
