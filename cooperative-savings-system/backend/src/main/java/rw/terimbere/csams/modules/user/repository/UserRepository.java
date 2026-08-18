package rw.terimbere.csams.modules.user.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import rw.terimbere.csams.modules.user.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findByUsernameIgnoreCaseAndDeletedFalse(String username);

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findByEmailIgnoreCaseAndDeletedFalse(String email);

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findWithRolesById(UUID id);

    boolean existsByUsernameIgnoreCaseAndDeletedFalse(String username);

    boolean existsByEmailIgnoreCaseAndDeletedFalse(String email);

    boolean existsByUsernameIgnoreCaseAndDeletedFalseAndIdNot(String username, UUID id);

    boolean existsByEmailIgnoreCaseAndDeletedFalseAndIdNot(String email, UUID id);

    boolean existsByNationalIdAndDeletedFalse(String nationalId);

    boolean existsByNationalIdAndDeletedFalseAndIdNot(String nationalId, UUID id);

    Optional<User> findByIdAndDeletedFalse(UUID id);

    long countByDeletedFalse();
}
