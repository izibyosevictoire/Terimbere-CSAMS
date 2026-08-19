package rw.terimbere.csams.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.modules.user.repository.UserRepository;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "app.seed.demo-data=true")
class DemoDataSeederIntegrationTest {

    @Autowired
    private DemoDataSeeder demoDataSeeder;

    @Autowired
    private CooperativeRepository cooperativeRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void seedsDemoCooperativeOnceAndLeavesRoomForRealData() {
        assertThat(cooperativeRepository.existsByRegistrationNumberIgnoreCaseAndDeletedFalse(
                        DemoDataSeeder.DEMO_REGISTRATION))
                .isTrue();
        assertThat(userRepository.findByUsernameIgnoreCaseAndDeletedFalse(DemoDataSeeder.DEMO_ADMIN_USERNAME))
                .isPresent();
        assertThat(userRepository.findByUsernameIgnoreCaseAndDeletedFalse("demo.jean"))
                .isPresent();

        long cooperativesBefore = cooperativeRepository.count();
        long usersBefore = userRepository.count();

        demoDataSeeder.run(new DefaultApplicationArguments());

        assertThat(cooperativeRepository.count()).isEqualTo(cooperativesBefore);
        assertThat(userRepository.count()).isEqualTo(usersBefore);
    }
}
