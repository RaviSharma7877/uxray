package com.dryno.backend.repository;

import com.dryno.backend.domain.Job;
import com.dryno.backend.domain.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {
    
    List<Job> findByStatus(JobStatus status);
    
    List<Job> findByStatusOrderByCreatedAtDesc(JobStatus status);
    
    List<Job> findAllByOrderByCreatedAtDesc();
    
    @Query("SELECT DISTINCT j FROM Job j LEFT JOIN FETCH j.screenshots WHERE j.id = :id")
    Optional<Job> findByIdWithScreenshots(@Param("id") UUID id);
}
